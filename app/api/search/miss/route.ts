import { NextResponse } from "next/server";
import { z } from "zod";

import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { isAutomatedAgent } from "@/lib/analytics/bot";
import { corsPreflight, corsRoute, isAllowedNativeOrigin } from "@/lib/api/cors";
import { missWords } from "@/lib/search/missWords";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A search that found nothing (admin item A11; the table is
 * docs/1.9-build/sql/search-misses.sql, the list is on the admin's Content
 * page).
 *
 * Anonymous under the three limits Edgar approved on 2026-11-09: never who
 * searched (this route reads no cookie or token and keeps no address), kept
 * 90 days (lib/ops/prune.ts), and emails and phone numbers removed before
 * anything is kept: lib/search/missWords.ts runs here again, whatever the
 * device already did. What is kept: the words, the day, the language and the
 * kind of device.
 *
 * It answers 204 to anything well formed, kept or not (the table may not be
 * there yet), so a client never retries and learns nothing. Held to 20 a
 * minute and 200 a day from one address.
 */

const bodySchema = z
  .object({
    words: z.string().max(400),
    locale: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/).optional(),
    platform: z.enum(["web", "android", "ios", "desktop"]),
  })
  .strict();

let absentUntil = 0;

async function handlePOST(req: Request) {
  const noStore = { "Cache-Control": "no-store" };
  const sfs = req.headers.get("sec-fetch-site");
  if (sfs && sfs !== "same-origin" && sfs !== "same-site" && sfs !== "none" && !isAllowedNativeOrigin(req.headers.get("origin"))) {
    return NextResponse.json({ ok: false }, { status: 403, headers: noStore });
  }
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.json({ ok: false }, { status: 415, headers: noStore });
  }
  if (isAutomatedAgent(req.headers.get("user-agent"), req.headers.get("sec-ch-ua"))) {
    return new NextResponse(null, { status: 204, headers: noStore });
  }
  const ip = ipKey(req.headers);
  if ((await rateLimited(`search-miss:${ip}`, 60, 20)) || (await rateLimited(`search-miss-day:${ip}`, 86_400, 200))) {
    return new NextResponse(null, { status: 429, headers: noStore });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400, headers: noStore });

  const words = missWords(parsed.data.words);
  if (words && Date.now() >= absentUntil) {
    try {
      const { error } = await createAdminClient()
        .from("search_misses")
        .insert({ words, locale: parsed.data.locale ?? null, platform: parsed.data.platform });
      // Until the owner has run the table's SQL: remembered ten minutes.
      if (error && isTableAbsent(error)) absentUntil = Date.now() + 10 * 60_000;
    } catch {
      // Never the reader's problem.
    }
  }
  return new NextResponse(null, { status: 204, headers: noStore });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
