// One streak for all of Purify: the days in a row a reader kept something.
//
// ── What keeps a day ────────────────────────────────────────────────────────
//
// Any mark in the rhythm ledger for that civil day: a prayer rule, a strand on
// Today, a plan day, a walkthrough chapter, a Bible chapter read, the saint of
// the day. One is enough. The ledger is `purify.prayers.<id>.dates` on the
// device and `prayer_completions` on the server (lib/rhythm/marks.ts).
//
// ── Hidden saves (the owner, 2026-10-02) ────────────────────────────────────
//
// "You get up to three hidden saves. It doesn't tell you that you can save or
// that you have three saves", and when one is used the reader hears only
// "It's okay. We got you this time.", so nobody learns to lean on them.
//
//   - A reader starts with one save.
//   - Every 7 days kept in a row earns one more, up to 3.
//   - A missed day spends one, automatically. The saved day does not add to
//     the count: kept 3, missed 1, kept 1 is a 4-day streak.
//   - A gap longer than the saves left ends the streak, and spends nothing:
//     a save only goes when it saves something.
//
// The number of saves never leaves the server. The reader learns only that a
// save was used (`lastSave`), once, through the sheet that says so.
//
// Pure, and shared by the device (signed-out readers, and the moment before
// the server answers) and the server (the number on a public profile).

import type { DayKey } from "@/lib/rhythm/dayKey";

export const START_SAVES = 1;
export const MAX_SAVES = 3;
/** Kept days in a row that earn one save. */
export const EARN_EVERY = 7;
/** The streak badges: 7, 40 and 100 days in a row. */
export const MILESTONES = [7, 40, 100] as const;
export type Milestone = (typeof MILESTONES)[number];

const DAY_MS = 86_400_000;
const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 for a `YYYY-MM-DD` key, or NaN when malformed. */
export function dayNumber(key: DayKey): number {
  const m = KEY.exec(key);
  if (!m) return Number.NaN;
  return Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS);
}

/** The key for a day number. */
export function keyFromNumber(n: number): DayKey {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export type StreakResult = {
  /** The streak as it stands today: 0 when it has ended or never began. */
  current: number;
  /** The longest run ever kept. */
  best: number;
  /** The last day kept on or before today. */
  lastKept: DayKey | null;
  keptToday: boolean;
  /**
   * The run as of `lastKept`, before today is judged. With `saves` this is
   * what the server stores, so a profile can be judged on any later day
   * without reading the ledger again (see `standing`).
   */
  run: number;
  /** HIDDEN. Saves left after `lastKept`, before today's pending gap. Never sent to a browser. */
  saves: number;
  /** HIDDEN. The latest day a save covered, today's pending gap included. */
  lastSave: DayKey | null;
  /** The day each streak badge was first reached. */
  milestones: Partial<Record<Milestone, DayKey>>;
};

type Walk = {
  run: number;
  best: number;
  saves: number;
  prev: number | null;
  saved: number[];
  milestones: Partial<Record<Milestone, DayKey>>;
};

/** Every kept day from the first, spending and earning saves as the reader went. */
function walk(days: Iterable<DayKey>, t: number): Walk {
  const sorted = [...new Set([...days].map(dayNumber))]
    .filter((n) => Number.isFinite(n) && n <= t)
    .sort((a, b) => a - b);
  const w: Walk = { run: 0, best: 0, saves: START_SAVES, prev: null, saved: [], milestones: {} };
  let sinceEarned = 0;
  for (const n of sorted) {
    if (w.prev === null) {
      w.run = 1;
    } else {
      const missed = n - w.prev - 1;
      if (missed === 0) {
        w.run += 1;
      } else if (missed <= w.saves) {
        w.saves -= missed;
        for (let d = w.prev + 1; d < n; d++) w.saved.push(d);
        w.run += 1;
      } else {
        w.run = 1;
        sinceEarned = 0;
      }
    }
    sinceEarned += 1;
    if (sinceEarned === EARN_EVERY) {
      w.saves = Math.min(MAX_SAVES, w.saves + 1);
      sinceEarned = 0;
    }
    if (w.run > w.best) w.best = w.run;
    for (const m of MILESTONES) {
      if (w.run === m && !w.milestones[m]) w.milestones[m] = keyFromNumber(n);
    }
    w.prev = n;
  }
  return w;
}

/**
 * The days between the last kept day and today that today's judgement
 * spends a save on, or none when the gap is too wide to save.
 */
function pending(s: { saves: number; lastKept: number | null }, t: number): { alive: boolean; saved: number[] } {
  if (s.lastKept === null) return { alive: false, saved: [] };
  const missed = t - s.lastKept - 1;
  if (missed <= 0) return { alive: true, saved: [] };
  if (missed > s.saves) return { alive: false, saved: [] };
  const saved: number[] = [];
  for (let d = s.lastKept + 1; d < t; d++) saved.push(d);
  return { alive: true, saved };
}

/**
 * Walk every kept day, then judge today.
 *
 * `days` may hold duplicates and any order; days after `today` are ignored
 * (a device a zone ahead of the server, or a clock set wrong).
 */
export function computeStreak(days: Iterable<DayKey>, today: DayKey): StreakResult {
  const t = dayNumber(today);
  const w = walk(days, t);
  const now = pending({ saves: w.saves, lastKept: w.prev }, t);
  const lastSaved = now.saved.length > 0 ? now.saved[now.saved.length - 1] : w.saved[w.saved.length - 1];
  return {
    current: now.alive ? w.run : 0,
    best: w.best,
    lastKept: w.prev === null ? null : keyFromNumber(w.prev),
    keptToday: w.prev === t,
    run: w.run,
    saves: w.saves,
    lastSave: lastSaved === undefined ? null : keyFromNumber(lastSaved),
    milestones: w.milestones,
  };
}

/**
 * The streak a stored row shows on `today`: what a profile prints. Yesterday
 * kept, or a gap the saves cover: still going. A wider gap: ended.
 */
export function standing(s: { run: number; saves: number; lastKept: DayKey | null }, today: DayKey): number {
  const last = s.lastKept ? dayNumber(s.lastKept) : null;
  const t = dayNumber(today);
  if (last === null || !Number.isFinite(last) || !Number.isFinite(t)) return 0;
  return pending({ saves: s.saves, lastKept: last }, t).alive ? s.run : 0;
}

/** The highest streak badge reached, or null. */
export function topMilestone(best: number): Milestone | null {
  let top: Milestone | null = null;
  for (const m of MILESTONES) if (best >= m) top = m;
  return top;
}

/** The next streak badge above `current`, and how many days are left to it. */
export function nextMilestone(current: number): { at: Milestone; left: number } | null {
  for (const m of MILESTONES) if (current < m) return { at: m, left: m - current };
  return null;
}

export type StripDay = { date: DayKey; state: "kept" | "saved" | "missed" | "today" };

/**
 * The last `count` days ending today, oldest first: kept, saved (a save
 * covered it, drawn as an ember), missed, or today not yet kept.
 */
export function weekStrip(days: Iterable<DayKey>, today: DayKey, count = 7): StripDay[] {
  const kept = new Set(days);
  const t = dayNumber(today);
  const w = walk(kept, t);
  const saved = new Set([...w.saved, ...pending({ saves: w.saves, lastKept: w.prev }, t).saved]);
  const out: StripDay[] = [];
  for (let n = t - count + 1; n <= t; n++) {
    const date = keyFromNumber(n);
    out.push({
      date,
      state: kept.has(date) ? "kept" : saved.has(n) ? "saved" : n === t ? "today" : "missed",
    });
  }
  return out;
}
