// The streak as the prayer rope (1.8): the owner's pick B of round 5,
// "The prayer rope, a knot a day" (Homebase/boards/purify-master/r18/choose/
// 5b-streak-new.png, 2026-10-28). The count of days over a line of seven
// knots, one for each day of this week, Monday first: a day kept is a knot
// tied, filled white; today, once kept, is lit; the days to come wait open.
// No flame and no red anywhere on it.
//
// Pure, so the week can be held by a test: the components draw what this
// says (components/streak/PrayerRope.tsx).

import type { DayKey } from "@/lib/rhythm/dayKey";

import { dayNumber, keyFromNumber, type StripDay } from "./compute";

/**
 * A knot's state. `kept` is tied (filled white), `saved` is a day a hidden
 * save held (a softer fill, as the sheet's ember is softer than a flame),
 * `missed` and `future` are open, and `open` is today not yet kept.
 */
export type KnotState = "kept" | "saved" | "missed" | "open" | "future";

export type Knot = { date: DayKey; state: KnotState; today: boolean };

/**
 * The seven days of the week that holds `today`, Monday first.
 *
 * `strip` is the streak's last seven days ending today (lib/streak/compute.ts,
 * weekStrip, or the server's copy of it), which always reaches back to this
 * week's Monday. `keptToday` is the streak's own word on today, so the knot
 * lights the moment the day is kept, before a server has heard of it.
 */
export function ropeWeek(strip: readonly StripDay[], today: DayKey, keptToday: boolean): Knot[] {
  const t = dayNumber(today);
  if (!Number.isFinite(t)) return [];
  // Day 0 is 1970-01-01, a Thursday: three days after a Monday.
  const sinceMonday = (((t + 3) % 7) + 7) % 7;
  const monday = t - sinceMonday;
  const held = new Map(strip.map((d) => [d.date, d.state] as const));
  return Array.from({ length: 7 }, (_, i): Knot => {
    const n = monday + i;
    const date = keyFromNumber(n);
    if (n > t) return { date, state: "future", today: false };
    if (n === t) return { date, state: keptToday || held.get(date) === "kept" ? "kept" : "open", today: true };
    const state = held.get(date);
    return { date, state: state === "kept" ? "kept" : state === "saved" ? "saved" : "missed", today: false };
  });
}

/** What Today's streak row draws: nothing, its height while the streak is read, or the rope. */
export type RopeRow = "none" | "hold" | "rope";

/**
 * The rope on Today. Nothing while the Day 1 card shows: on a first day that
 * card stands alone (the owner's pick B of round 6, "Day 1 alone"), and the
 * rope returns once Day 1 is done or dismissed. Nothing from 6 pm while the
 * evening card stands in for it (`atRiskShown`). Before the streak is read,
 * the row's height, so the cards under it do not jump when it lands.
 */
export function ropeRow(view: { ready: boolean; atRisk: boolean }, dayOne: boolean): RopeRow {
  if (dayOne) return "none";
  if (!view.ready) return "hold";
  return view.atRisk ? "none" : "rope";
}

/**
 * The evening card (components/streak/StreakAtRisk.tsx), the rope with
 * today's knot pulsing: from 6 pm, while a streak is going and today is not
 * kept. Where a Day 1 card stands it waits too, since it is the rope as well.
 */
export function atRiskShown(view: { ready: boolean; atRisk: boolean }, dayOne: boolean): boolean {
  return view.ready && view.atRisk && !dayOne;
}
