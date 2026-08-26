/**
 * The day buckets behind every admin chart, with TODAY in them.
 *
 * ── The bug this exists to end ──────────────────────────────────────────
 *
 * Every chart route built its own window, and they did not agree.
 *
 *   app/api/admin/overview/route.ts got it right:
 *     for (let i = 29; i >= 0; i--) new Date(now - i * dayMs)
 *     at i = 0 that is `now`, so the last bucket is today.
 *
 *   app/api/admin/users/route.ts got it wrong:
 *     since30 = midnight of (today - 30); for (i = 0; i < 30; i++) since30 + i
 *     which is today-30 .. today-1. Today never appears, so the signup chart
 *     always ended yesterday and the current day's signups were invisible
 *     until the following morning.
 *
 * The two shapes are hard to tell apart by eye, which is exactly why this is
 * one function with tests rather than a rule everyone is asked to remember.
 *
 * ── What "last N days" means here ───────────────────────────────────────
 *
 * N buckets ENDING TODAY: today-(N-1) .. today. So dayKeys(30) is thirty
 * points, the last of which is the current, partial day. That matches what
 * overview already did, so adopting it changes no chart that was correct.
 *
 * ── Today is partial, and that is not a defect ──────────────────────────
 *
 * The final bucket covers a day still in progress, so it is expected to sit
 * below its neighbours until the day closes. A chart that hides the current
 * day to avoid that dip is answering a question nobody asked: the operator
 * looking at the dashboard at 3pm wants to know what has happened by 3pm.
 * Callers that need to say so can ask isPartial() about a key.
 *
 * ── UTC, deliberately ───────────────────────────────────────────────────
 *
 * Rows are bucketed on the UTC date already (`created_at.slice(0, 10)` all
 * over the admin routes), so these keys are UTC too. Mixing a local-midnight
 * window with UTC-keyed rows is how a chart gains a phantom empty day at one
 * end. If the operator's own timezone should drive this, that is a deliberate
 * change to make everywhere at once, not per route.
 */

const DAY_MS = 86_400_000;

/** The UTC date key, YYYY-MM-DD, for an instant. */
export function dayKey(d: Date | string): string {
  return (typeof d === "string" ? new Date(d) : d).toISOString().slice(0, 10);
}

/**
 * N day keys, oldest first, the LAST of which is today.
 *
 * `now` is injectable so the tests can pin a date; production passes nothing.
 */
export function dayKeys(days: number, now: Date = new Date()): string[] {
  const n = Math.max(1, Math.floor(days));
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(dayKey(new Date(now.getTime() - i * DAY_MS)));
  }
  return out;
}

/**
 * The instant to filter from: midnight UTC at the START of the window.
 *
 * Snapped to midnight so the query cannot drop rows from the oldest bucket
 * that happened earlier in the day than this moment. An unsnapped `now - 30d`
 * lower bound silently truncates the first bar of the chart.
 */
export function windowStart(days: number, now: Date = new Date()): string {
  const n = Math.max(1, Math.floor(days));
  const d = new Date(now.getTime() - (n - 1) * DAY_MS);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** A zeroed bucket map in chart order, ready to be counted into. */
export function emptyBuckets(days: number, now: Date = new Date()): Map<string, number> {
  return new Map(dayKeys(days, now).map((k) => [k, 0]));
}

/**
 * Count rows into day buckets and return them in chart order.
 *
 * Rows outside the window are ignored rather than clamped into the end bars,
 * which is what makes a stray old row inflate the oldest bucket.
 */
export function bucketByDay<T>(
  rows: readonly T[],
  getDate: (row: T) => string | Date | null | undefined,
  days: number,
  now: Date = new Date(),
): { date: string; count: number }[] {
  const buckets = emptyBuckets(days, now);
  for (const row of rows) {
    const raw = getDate(row);
    if (!raw) continue;
    const k = typeof raw === "string" ? raw.slice(0, 10) : dayKey(raw);
    if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

/** True for the current, still-running day: the last key dayKeys returns. */
export function isPartial(key: string, now: Date = new Date()): boolean {
  return key === dayKey(now);
}
