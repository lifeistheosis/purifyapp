/**
 * The Traffic tab's visitors chart (the owner, 2026-11-02: "show a chart for
 * the traffic for 7/14/21/30/60/90/120 days (counting from current and a last
 * night switch) with a medium average line").
 *
 * One read of CHART_FETCH days feeds every range: a range is the last N points
 * of it, so moving between ranges asks the database nothing. "Current" and
 * "last night" are the traffic route's latest=now|complete
 * (lib/admin/dayWindow.ts): the series ends on today, still running, or on
 * yesterday, every day in it finished.
 *
 * The line across the chart is the median day of the window, the middle
 * value, so one busy day does not lift it the way it lifts a mean.
 */

export const CHART_RANGES = [7, 14, 21, 30, 60, 90, 120] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

/** The longest range: the one read the chart makes. */
export const CHART_FETCH: ChartRange = 120;

/** The days the traffic route reads for a range ("14d"). Anything it does not know is 30. */
export function rangeDays(range: string | null | undefined): number {
  const m = /^(\d+)d$/.exec(range ?? "");
  const days = m ? Number(m[1]) : NaN;
  return (CHART_RANGES as readonly number[]).includes(days) ? days : 30;
}

/** The last `days` points of a series that is oldest first. */
export function windowOf<T>(points: readonly T[], days: number): T[] {
  return points.slice(-Math.max(1, Math.floor(days)));
}

/** The middle value, or the mean of the two middle ones when the count is even. Null when there are none. */
export function median(values: readonly number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
