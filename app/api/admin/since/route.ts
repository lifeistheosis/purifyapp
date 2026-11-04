import { NextResponse, type NextRequest } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { lineFrom, type UsageMark } from "@/lib/admin/since";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { readTimelineWindow } from "@/lib/admin/timelineRead";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What changed since he last looked: the Home's feed (the owner's pick for
 * Home on sheet r3-15, 2026-10-30, B and A mixed).
 *
 * THE LINE is where his previous visit to the admin ended, from his own use
 * log (lib/admin/since.ts says how), or where he last pressed Mark all as
 * seen. The page may send `at` to keep the line it already showed, or to move
 * it to now. A log that cannot be read gives the last 24 hours, and `basis`
 * says so: the page never presents a guessed line as his.
 *
 * THE ROWS are read by lib/admin/timelineRead.ts, from the line to now: paid
 * orders, refunds paid out, new readers, new Plus members (the thank-you email
 * the webhook sends for a first purchase is the only record of one:
 * entitlements keeps no start date), support tickets, blue check and clergy
 * seal requests, and the board's ticks. A source that does not answer is
 * named in `unread`, so a quiet feed is never a failed one in disguise.
 * Nothing is written. /api/admin/timeline reads the same rows a week at a
 * time, for the log that keeps everything.
 *
 * Admin only, like every route here: 403 to anyone else.
 */

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const now = Date.now();
  const asked = req.nextUrl.searchParams.get("at");
  const unread: string[] = [];

  // ── The line ─────────────────────────────────────────────────────────
  let rows: UsageMark[] | null = null;
  if (!asked) {
    const since30 = new Date(now - 30 * 86_400_000).toISOString();
    const { data, error } = await admin
      .from("admin_usage")
      .select("at, kind, label")
      .eq("actor_email", adminUser.email ?? "")
      .gte("at", since30)
      .order("at", { ascending: false })
      // One request's worth is enough: the line needs only his newest rows,
      // back to the first pause of half an hour, and a visit writes a few
      // dozen at most.
      .limit(1000);
    if (error) {
      if (!isTableAbsent(error)) console.warn("[admin/since] your use log read failed", error.message);
      unread.push("your use log");
    } else rows = (data ?? []) as UsageMark[];
  }
  const line = lineFrom(rows, now, asked);

  // ── The rows ─────────────────────────────────────────────────────────
  const w = await readTimelineWindow(admin, line.at, null, { tag: "since" });

  return NextResponse.json(
    {
      line: line.at,
      basis: line.basis,
      now: new Date(now).toISOString(),
      events: w.events.slice(0, 120),
      orderCents: w.orderCents,
      readers: w.readers,
      unread: [...unread, ...w.unread],
    },
    NO_STORE,
  );
}
