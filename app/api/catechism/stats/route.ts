import { NextResponse } from "next/server";

import { corsPreflight, corsRoute, isAllowedNativeOrigin } from "@/lib/api/cors";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { loadBank } from "@/lib/catechism/bank";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { catechismStatsSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The anonymous path's only write: bump the per-question counters.
 *
 * A signed-out reader's attempt stays on their device. What leaves it is two
 * lists of question ids, shown and correct, so the correct-rate in the admin
 * panel still counts them. No session id, no reader, no date: the request
 * carries nothing that could be joined back to a person, and the table it
 * lands in has no column for one.
 *
 * Hardened like /api/track: JSON only, Sec-Fetch-Site sanity with the native
 * shells exempted, a per-IP budget, and every id checked against the bank so
 * junk cannot pollute the counters. A missing table drops the write and
 * answers ok; the counters are a convenience, not a record.
 */
async function handlePOST(req: Request) {
  const sfs = req.headers.get("sec-fetch-site");
  const fromNativeShell = isAllowedNativeOrigin(req.headers.get("origin"));
  if (sfs && sfs !== "same-origin" && sfs !== "same-site" && sfs !== "none" && !fromNativeShell) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415 });
  }

  const ip = ipKey(req.headers);
  if (await rateLimited(`catechism-stats:${ip}`, 60, 10)) {
    return new NextResponse(null, { status: 429 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = catechismStatsSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const known = new Set(loadBank().map((q) => q.id));
  const shown = [...new Set(parsed.data.question_ids)].filter((id) => known.has(id));
  const shownSet = new Set(shown);
  const correct = [...new Set(parsed.data.correct_ids)].filter((id) => shownSet.has(id));
  if (shown.length === 0) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const { error } = await createAdminClient().rpc("bump_quiz_stats", {
      question_ids: shown,
      correct_ids: correct,
    });
    if (error && !isTableAbsent(error)) {
      console.warn("[catechism] bump_quiz_stats failed", error.message);
    }
  } catch (e) {
    console.warn("[catechism] stats", (e as Error).message);
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
