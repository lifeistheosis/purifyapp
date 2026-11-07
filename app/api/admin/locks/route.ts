import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { LOCK_EVENTS, summarizeLocks, type LockEventRow, type LockRow } from "@/lib/analytics/lockCounting";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type LocksAdminPayload =
  | { absent: false; truncated: boolean; days: number; locks: LockRow[]; taps: number; bought: number }
  | { absent: true }
  | { unavailable: string };

const DAY = 86_400_000;
/** Rows are read a page at a time; past this many, the sums say they are partial. */
const MAX_ROWS = 50_000;
const PAGE = 1_000;

// Money > Subscriptions > Locks: which lock a reader taps, and which leads to
// a purchase (1.9, lib/analytics/lockCounting.ts). Only the two lock events
// of analytics_events are read, and nothing in them names a reader. The
// window is 7, 30 or 90 days.
export async function GET(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const asked = Number(new URL(req.url).searchParams.get("days"));
  const days = asked === 7 || asked === 90 ? asked : 30;
  const from = new Date(Date.now() - days * DAY).toISOString();

  const supa = createAdminClient();
  const rows: LockEventRow[] = [];
  let truncated = false;
  for (let start = 0; ; start += PAGE) {
    const { data, error } = await supa
      .from("analytics_events")
      .select("name, props")
      .in("name", [...LOCK_EVENTS])
      .gte("ts", from)
      // Then by id: the locks' rows are kept to the day, so every row of a day
      // has the same time, and pages cut through a tie may repeat a row or
      // skip one (lib/supabase/pageAll.ts).
      .order("ts", { ascending: true })
      .order("id", { ascending: true })
      .range(start, start + PAGE - 1);
    if (error) {
      const payload: LocksAdminPayload = isTableAbsent(error) ? { absent: true } : { unavailable: error.message };
      return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
    }
    rows.push(...((data ?? []) as LockEventRow[]));
    if (!data || data.length < PAGE) break;
    if (rows.length >= MAX_ROWS) {
      truncated = true;
      break;
    }
  }

  const payload: LocksAdminPayload = { absent: false, truncated, days, ...summarizeLocks(rows) };
  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
