import { NextResponse, type NextRequest } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { lineFrom, type UsageMark } from "@/lib/admin/since";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { TIMELINE_FLOOR, timelineWindow } from "@/lib/admin/timeline";
import { readTimelineWindow } from "@/lib/admin/timelineRead";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The log that never resets (the owner, 2026-11-04): "I don't want it to just
 * keep resetting and deleting ... a visual log that just doesn't go away",
 * this week first, and more as he scrolls, never everything since Purify
 * started at once.
 *
 * GET ?before=<ISO> gives the week before that moment (the newest week with
 * no `before`); ?after=<ISO> gives everything from then to now, for the page
 * to add what is new without reading its week again; ?days= changes the
 * length, 1 to 31. The rows are lib/admin/timelineRead.ts, the same rows and
 * words as Home's feed, each with the time it happened. `more` says whether
 * an older week can be asked for; nothing is read from before
 * TIMELINE_FLOOR. The first page also carries where he last looked, so the
 * page can draw that line in the log instead of starting the log there.
 *
 * Nothing is written. Admin only: 403 to anyone else.
 */

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const now = Date.now();
  const q = req.nextUrl.searchParams;
  const win = timelineWindow({ before: q.get("before"), after: q.get("after"), days: q.get("days") }, now);
  if (!win) return NextResponse.json({ error: "Bad window" }, { status: 400 });

  // Where he last looked, on the first page only: the line drawn in the log.
  let line: { at: string; basis: string } | null = null;
  const unread: string[] = [];
  if (win.first) {
    const since30 = new Date(now - 30 * 86_400_000).toISOString();
    const { data, error } = await admin
      .from("admin_usage")
      .select("at, kind, label")
      .eq("actor_email", adminUser.email ?? "")
      .gte("at", since30)
      .order("at", { ascending: false })
      .limit(1000);
    if (error) {
      if (!isTableAbsent(error)) console.warn("[admin/timeline] your use log read failed", error.message);
      unread.push("your use log");
    }
    const l = lineFrom(error ? null : ((data ?? []) as UsageMark[]), now, null);
    line = { at: l.at, basis: l.basis };
  }

  const w = win.empty
    ? { events: [], orderCents: 0, readers: { count: 0, times: [] as string[] }, unread: [] as string[], full: [] as string[] }
    : await readTimelineWindow(admin, win.from, win.to, { cap: 200, tag: "timeline" });

  return NextResponse.json(
    {
      from: win.from,
      to: win.to,
      now: new Date(now).toISOString(),
      floor: TIMELINE_FLOOR,
      more: win.more,
      line,
      events: w.events,
      readers: w.readers,
      orderCents: w.orderCents,
      unread: [...unread, ...w.unread],
      full: w.full,
    },
    NO_STORE,
  );
}
