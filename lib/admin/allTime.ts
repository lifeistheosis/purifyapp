import type { SupabaseClient } from "@supabase/supabase-js";

import { daysSince } from "./dayWindow";

/**
 * How many days "All time" covers for one admin read (the owner, 2026-11-11:
 * "set up a all time option for the charts"). It is measured from the oldest
 * row that read would count, to today, through daysSince (lib/admin/dayWindow.ts),
 * which caps it, so one row with a wrong timestamp cannot ask for years of
 * empty days. `names` narrows analytics_events to the events the read itself
 * counts, so the window starts where its own rows start. No row at all is one
 * day, as daysSince says.
 */
export async function allTimeDays(
  db: SupabaseClient,
  table: string,
  column: string,
  names?: readonly string[],
  now: Date = new Date(),
): Promise<number> {
  let q = db.from(table).select(column).order(column, { ascending: true }).limit(1);
  if (names) q = q.in("name", [...names]);
  const { data } = await q;
  const first = (data?.[0] as Record<string, unknown> | undefined)?.[column];
  return daysSince(typeof first === "string" ? first : null, now);
}
