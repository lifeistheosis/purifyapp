import { computeStreak, longestStreak, rhythm } from "@/lib/campaigns/streak";
import { rangeValue } from "./ingest";
import { rangeOf } from "./calendar";
import type { Goal, Series } from "./types";

/**
 * Streaks and records for an admin goal.
 *
 * REUSES lib/campaigns/streak.ts RATHER THAN ADDING A THIRD DIALECT. That file
 * says why it was copied from lib/fasting/streak.ts instead of reinvented:
 * "answering it two different ways would mean two different definitions of a
 * streak inside one app." A third definition here would be the exact thing it
 * exists to prevent, so this module builds the kept-day set and hands it over.
 *
 * ONE ADAPTATION, AND IT IS THE IMPORTANT ONE. computeStreak forgives an
 * unmarked TODAY and breaks on any earlier gap, which is right for a reader
 * who has not prayed yet at 9am. Admin data is not live: an export ending on
 * the 18th is read on the 22nd. Passing the real today would walk back through
 * four dayless days and return zero for every goal, always. So the anchor is
 * the dataset's LAST MEASURED DAY, and the UI says which day that is, so a zero
 * reads as "the export ended on a down day" rather than "you have never done
 * well".
 *
 * NO BADGES, NO POINTS, NO LEVELS. Not because CONTRIBUTING.md's six-point bar
 * binds the admin panel, which it does not, but because an invented score is
 * precisely the failure calendar.ts:229 already names: making a number look
 * like an achievement when nothing measured it. Everything below is a fact with
 * a date. "level" is also avoided as a word: it already means stock-versus-flow
 * in this module.
 */

export type DayResult = { day: string; value: number; met: boolean };

export type GoalRecords = {
  /** Consecutive days meeting the target, ending at the last measured day. */
  streak: number;
  /** The longest run anywhere in the history. */
  bestRun: number;
  /** Marks for the last 14 days, oldest first, for the rhythm strip. The
   *  shape is rhythm()'s own, { key, kept }, kept verbatim rather than renamed
   *  so the two cannot drift apart. */
  rhythm: { key: string; kept: boolean }[];
  /** Days met, and days measured. */
  met: number;
  measured: number;
  /** The day everything here is anchored on. Never the wall clock. */
  asOf: string | null;
  /** Best single day on record, with the day it happened. */
  bestDay: { day: string; value: number } | null;
  /** Best calendar week and month, by the same rule the goal is graded on. */
  bestWeek: { from: string; value: number } | null;
  bestMonth: { month: string; value: number } | null;
};

const EMPTY: GoalRecords = {
  streak: 0,
  bestRun: 0,
  rhythm: [],
  met: 0,
  measured: 0,
  asOf: null,
  bestDay: null,
  bestWeek: null,
  bestMonth: null,
};

/**
 * Per-day outcomes against a daily target.
 *
 * Only DAILY goals produce a streak. A weekly or monthly target has no per-day
 * truth to be consecutive about, and pretending otherwise by dividing it would
 * invent a threshold nobody set.
 */
/**
 * The first day the metric was real.
 *
 * A launch export opens with weeks of zeros from before anyone could install
 * anything. Counting those as missed days is the difference between "met on 23
 * of 86" and "met on 23 of 60", and the first is both discouraging and a
 * different question from the one the target was set against. The seeded target
 * is placed using this same rule, so the hit rate quoted on the goal and the
 * count shown beside the streak now share a denominator.
 *
 * Only the LEADING run of zeros is dropped. A zero after launch is a real day
 * on which nothing happened, and hiding those would flatter the record.
 */
function fromLaunch(points: { day: string; value: number }[]): { day: string; value: number }[] {
  const first = points.findIndex((p) => p.value !== 0);
  return first < 0 ? [] : points.slice(first);
}

export function dayResults(series: Series | null, goal: Goal | null): DayResult[] {
  // Paused is checked here and not only by the caller, because gradePeriod
  // already filters paused goals out of every grade and a streak that kept
  // running on a paused goal would be the one surface still scoring something
  // the operator has explicitly stopped measuring.
  if (!series || !goal || goal.paused) return [];
  if (goal.period !== "daily" || goal.target <= 0) return [];
  const measured = series.points
    .filter((p) => p.value !== null)
    .map((p) => ({ day: p.day, value: p.value as number }));

  return fromLaunch(measured).map((p) => ({
    day: p.day,
    value: p.value,
    met: p.value >= goal.target,
  }));
}

export function recordsFor(series: Series | null, goal: Goal | null): GoalRecords {
  const results = dayResults(series, goal);
  // Both checks. The second is what dayResults already guarantees, but the
  // compiler cannot see through it, and asserting it here is better than a
  // non-null assertion at each use.
  if (!series || results.length === 0) return EMPTY;

  const asOf = results[results.length - 1].day;
  const kept = new Set(results.filter((r) => r.met).map((r) => r.day));

  /*
   * Anchored on the data, not the clock, AND the forgiveness is cancelled.
   *
   * computeStreak deliberately forgives an unmarked anchor day: a reader who
   * has not prayed yet at 9am still has an open streak, because the day is not
   * over. That is right for them and wrong here. Every day in an export is a
   * finished day. The 18th did not "not happen yet", it happened and it came in
   * at -5, which is a miss.
   *
   * Left unhandled this reported a streak of 1 on data whose most recent day
   * failed, by skipping over the failure to count the 17th. So the anchor day
   * must itself be kept for a run to be live.
   */
  const streak = kept.has(asOf) ? computeStreak(kept, asOf) : 0;
  const bestRun = longestStreak(kept);

  const strip = rhythm(
    results.filter((r) => r.met).map((r) => ({ day_key: r.day })),
    14,
    asOf,
  );

  // Computed once. Written three times it walked every calendar month of the
  // history three times over for one answer.
  const month = bestWindow(series, "monthly");

  const bestDay = results.reduce<{ day: string; value: number } | null>(
    (best, r) => (best === null || r.value > best.value ? { day: r.day, value: r.value } : best),
    null,
  );

  return {
    streak,
    bestRun,
    rhythm: strip,
    met: kept.size,
    measured: results.length,
    asOf,
    bestDay,
    bestWeek: bestWindow(series, "weekly"),
    bestMonth: month ? { month: month.from.slice(0, 7), value: month.value } : null,
  };
}

/**
 * The best calendar week or month on record.
 *
 * Walks real calendar windows rather than rolling ones, because "best week"
 * should mean a week someone could point at, and because it is the same
 * bucketing the weekly and monthly goals are graded on. rangeValue applies the
 * stock-versus-flow rule, so this is a sum for a flow and a level for a stock,
 * exactly as everywhere else.
 */
function bestWindow(
  series: Series,
  kind: "weekly" | "monthly",
): { from: string; value: number } | null {
  const measured = series.points.filter((p) => p.value !== null);
  if (measured.length === 0) return null;

  const seen = new Set<string>();
  let best: { from: string; value: number } | null = null;

  for (const p of measured) {
    const { from, to } = rangeOf({ kind, anchor: p.day });
    if (seen.has(from)) continue;
    seen.add(from);
    const v = rangeValue(series, from, to);
    if (v.covered === 0) continue;
    if (best === null || v.value > best.value) best = { from, value: v.value };
  }
  return best;
}
