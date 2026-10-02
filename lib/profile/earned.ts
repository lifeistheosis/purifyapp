import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { orthodoxPascha } from "@/lib/calendar/pascha";

import type { EarnedBadgeId } from "./badges";

// The badges a reader reaches by their own practice, read from what Purify
// already records. Nothing here is stored: a badge appears the moment the
// practice is on file and needs no job to award it.
//
//   psalter      the Psalter by kathisma read to the end, a finished plan
//   gospels      the Four Gospels read to the end
//                Both leave a `plan:<id>` day mark when the last day is read
//                (lib/plans/progress.ts), which syncs with every other day
//                mark into prayer_completions (lib/prayers/sync.ts).
//   lent         something kept in Purify on every one of the forty days of
//                Great Lent, Clean Monday to the Friday before Lazarus
//                Saturday, in the latest Lent that has ended
//   first_share  a line from Scripture or the Fathers shared to Community
//
// Only what has reached the server counts, so a reader who never signed in
// on the device they read on has nothing here yet; that is the honest answer.

const DAY = 86_400_000;

/**
 * A calendar date as noon UTC, so it reads as the same day in every time
 * zone a reader is in: "2026-07-01" alone parses as UTC midnight, which is
 * still June 30 in the Americas, and the badge would say "Since June".
 */
const midday = (date: string) => `${date.slice(0, 10)}T12:00:00Z`;

/** Clean Monday to the Friday before Lazarus Saturday: [start, end) as YYYY-MM-DD. */
export function lentWindow(year: number): { start: string; end: string } {
  const p = orthodoxPascha(year).getTime();
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  return { start: iso(p - 48 * DAY), end: iso(p - 8 * DAY) };
}

/** The latest Great Lent whose forty days are all in the past. */
export function lastFinishedLent(now: Date): { year: number; start: string; end: string } {
  const y = now.getUTCFullYear();
  const thisYear = lentWindow(y);
  const done = new Date(`${thisYear.end}T00:00:00Z`).getTime() <= now.getTime();
  return done ? { year: y, ...thisYear } : { year: y - 1, ...lentWindow(y - 1) };
}

export async function earnedBadges(
  admin: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<{ id: EarnedBadgeId; since: string | null }[]> {
  const lent = lastFinishedLent(now);
  const firstMark = (rule: string) =>
    admin
      .from("prayer_completions")
      .select("prayed_on")
      .eq("user_id", userId)
      .eq("rule_id", rule)
      .order("prayed_on", { ascending: true })
      .limit(1);
  const [psalter, gospels, lentDays, share] = await Promise.all([
    firstMark("plan:psalter"),
    firstMark("plan:gospels"),
    admin
      .from("prayer_completions")
      .select("prayed_on")
      .eq("user_id", userId)
      .gte("prayed_on", lent.start)
      .lt("prayed_on", lent.end)
      .limit(1000),
    admin
      .from("community_posts")
      .select("created_at")
      .eq("user_id", userId)
      .in("kind", ["scripture", "father"])
      .eq("status", "visible")
      .is("group_id", null)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  const out: { id: EarnedBadgeId; since: string | null }[] = [];
  const first = (r: { data: unknown; error: unknown }, key: string) =>
    !r.error && Array.isArray(r.data) && r.data.length > 0 ? String((r.data[0] as Record<string, unknown>)[key]) : null;

  const p = first(psalter, "prayed_on");
  if (p) out.push({ id: "psalter", since: midday(p) });
  const g = first(gospels, "prayed_on");
  if (g) out.push({ id: "gospels", since: midday(g) });
  if (!lentDays.error && Array.isArray(lentDays.data)) {
    const days = new Set((lentDays.data as { prayed_on: string }[]).map((r) => String(r.prayed_on).slice(0, 10)));
    if (days.size >= 40) out.push({ id: "lent", since: midday(lent.end) });
  }
  const s = first(share, "created_at");
  if (s) out.push({ id: "first_share", since: s });
  return out;
}
