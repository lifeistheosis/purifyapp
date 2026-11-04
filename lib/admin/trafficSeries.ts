import { dayKey, windowEnd, windowStart, type LatestDay } from "./dayWindow";

/**
 * Traffic's days, counted once.
 *
 * WHY. The owner, 2026-11-04: "the chart numbers load pretty slow on first
 * open". /api/admin/traffic asked analytics_daily_buckets for the whole
 * window on every open, and that function counts the page views row by row
 * from the window's first day to now: about 230,000 rows a month in October
 * 2026, so close to a million for the chart's 120 days. Home, Traffic's
 * Overview and the chart each asked for it (two windows of 90 days and one
 * of 120), so one open counted them three times over.
 *
 * WHAT THIS DOES. A day that is over does not change. So the days that are
 * over are counted once per server and kept here, and only the day still
 * running (two, for the first quarter hour after midnight) is counted on each
 * request, and even that is kept for half a minute. The counting itself is
 * the same function as before, called for fewer days: the numbers are the
 * same numbers, only read less often. The first open after the server starts
 * counts the window once, as every open used to; every open after it counts
 * today alone.
 *
 * A day is over a quarter of an hour after midnight UTC, the same rule as
 * analytics_daily_close (20261009000000_analytics_daily.sql), so a page view
 * stamped just before midnight has landed before its day is kept.
 *
 * Pure apart from the `read` it is given, so the cache can be held to its
 * rules with a counted fake (lib/admin/__tests__/trafficSeries.test.ts).
 */

export type DayPoint = { date: string; visitors: number; views: number; signups: number };

/** Counts `days` UTC days from the one `sinceIso` falls on, one point each. Throws when it cannot. */
export type ReadDays = (sinceIso: string, days: number) => Promise<DayPoint[]>;

const DAY_MS = 86_400_000;
/** A day is kept once this long has passed since it ended. */
export const SETTLE_MS = 15 * 60_000;
/** How long the days still running are kept before they are counted again. */
export const OPEN_TTL_MS = 30_000;
/** More days than any window asks for ("all" stops at 730, lib/admin/dayWindow.ts). */
const KEEP_DAYS = 800;

export function addDays(key: string, n: number): string {
  return dayKey(new Date(Date.parse(`${key}T00:00:00.000Z`) + n * DAY_MS));
}

export function daysFrom(from: string, through: string): number {
  return Math.round((Date.parse(`${through}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS) + 1;
}

/** The last UTC day whose counts can no longer change, at `now`. */
export function lastFinalDay(now: number): string {
  return addDays(dayKey(new Date(now - SETTLE_MS)), -1);
}

/** The runs of days from `from` to `through` that `has` says are not held, oldest first. */
export function missingRuns(has: (day: string) => boolean, from: string, through: string): { from: string; days: number }[] {
  const runs: { from: string; days: number }[] = [];
  if (from > through) return runs;
  let start: string | null = null;
  let n = 0;
  for (let d = from; d <= through; d = addDays(d, 1)) {
    if (has(d)) {
      if (start) runs.push({ from: start, days: n });
      start = null;
      n = 0;
    } else {
      if (!start) start = d;
      n += 1;
    }
  }
  if (start) runs.push({ from: start, days: n });
  return runs;
}

const zero = (date: string): DayPoint => ({ date, visitors: 0, views: 0, signups: 0 });

export function createTrafficSeries(read: ReadDays, clock: () => number = () => Date.now()) {
  const kept = new Map<string, DayPoint>();
  const filling = new Map<string, Promise<void>>();
  let open: { key: string; at: number; points: Promise<DayPoint[]> } | null = null;

  function fill(from: string, days: number): Promise<void> {
    const key = `${from}+${days}`;
    let p = filling.get(key);
    if (!p) {
      p = read(`${from}T00:00:00.000Z`, days)
        .then((points) => {
          const last = addDays(from, days - 1);
          for (const pt of points) if (pt.date >= from && pt.date <= last) kept.set(pt.date, pt);
          if (kept.size > KEEP_DAYS) {
            const old = [...kept.keys()].sort().slice(0, kept.size - KEEP_DAYS);
            for (const k of old) kept.delete(k);
          }
        })
        .finally(() => filling.delete(key));
      filling.set(key, p);
    }
    return p;
  }

  function readOpen(from: string, days: number, now: number): { points: Promise<DayPoint[]>; fresh: boolean } {
    const key = `${from}+${days}`;
    if (open && open.key === key && now - open.at < OPEN_TTL_MS) return { points: open.points, fresh: false };
    const points = read(`${from}T00:00:00.000Z`, days);
    open = { key, at: now, points };
    // A failed read is not kept: the next request asks again.
    points.catch(() => {
      if (open?.points === points) open = null;
    });
    return { points, fresh: true };
  }

  /**
   * The window the route used to ask the database for: `days` days ending on
   * today ("now") or on yesterday ("complete"), as windowStart and windowEnd
   * in lib/admin/dayWindow.ts draw it. `counted` is how many days this call
   * had the database count, for the route's log line.
   */
  async function series(days: number, latest: LatestDay): Promise<{ points: DayPoint[]; through: string; counted: number }> {
    const now = clock();
    const end = windowEnd(latest, new Date(now));
    const through = dayKey(end);
    const first = dayKey(new Date(windowStart(days, end)));
    const final = lastFinalDay(now);
    const keptThrough = through < final ? through : final;
    let counted = 0;

    const runs = missingRuns((d) => kept.has(d), first, keptThrough);
    for (const r of runs) counted += r.days;
    await Promise.all(runs.map((r) => fill(r.from, r.days)));

    const openPoints = new Map<string, DayPoint>();
    if (through > final) {
      const from = addDays(final, 1) > first ? addDays(final, 1) : first;
      const n = daysFrom(from, through);
      const o = readOpen(from, n, now);
      if (o.fresh) counted += n;
      for (const pt of await o.points) openPoints.set(pt.date, pt);
    }

    const points: DayPoint[] = [];
    for (let d = first; d <= through; d = addDays(d, 1)) points.push(kept.get(d) ?? openPoints.get(d) ?? zero(d));
    return { points, through, counted };
  }

  return { series, keptDays: () => kept.size };
}
