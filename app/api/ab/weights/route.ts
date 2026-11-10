import { NextResponse } from "next/server";

import { tally, verdict } from "@/lib/ab/bandit";
import { readAbRows } from "@/lib/ab/read";
import { AB_TESTS, runningTest } from "@/lib/ab/tests";
import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { litNow } from "@/lib/onboarding/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The share of new devices each version of a running test is given (1.9,
 * lib/ab/bandit.ts): one public setting, the same for every device, with no
 * reader in it. A device asks for it with no cookie and no sign-in
 * (lib/ab/device.ts), then chooses its version itself, by a number that
 * never leaves it. Nothing about the caller is read or kept here.
 *
 *   { v: 1, tests: { "account-place": { weights: { card: 0.5, end: 0.5 } } } }
 *
 * Only tests that are running are answered, so before release, and with no
 * test registered, the answer is an empty list. Worked out from the totals
 * at most once an hour: the two kinds of row a test sends, read a page at a
 * time. A failure to read answers with no shares, and a device with none
 * uses equal ones.
 */
export type AbWeightsPayload = { v: 1; tests: Record<string, { weights: Record<string, number> }> };

const HOUR = 60 * 60 * 1000;

let cache: { at: number; body: AbWeightsPayload } | null = null;

async function handleGET(req: Request) {
  if (await rateLimited(`ab-weights:${ipKey(req.headers)}`, 60, 30)) return new NextResponse(null, { status: 429 });
  const headers = { "Cache-Control": "public, max-age=3600" };
  if (cache && Date.now() - cache.at < HOUR) return NextResponse.json(cache.body, { headers });

  const today = new Date().toISOString().slice(0, 10);
  const lit = litNow();
  const running = AB_TESTS.filter((t) => runningTest(t.surface, today, lit)?.id === t.id);
  const body: AbWeightsPayload = { v: 1, tests: {} };
  if (running.length) {
    const read = await readAbRows(running);
    // Unread: no shares are answered, and nothing is kept, so the next ask tries again.
    if (!read) return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
    for (const test of running) body.tests[test.id] = { weights: verdict(test, tally(test, read.rows, today), today).weights };
  }
  cache = { at: Date.now(), body };
  return NextResponse.json(body, { headers });
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
