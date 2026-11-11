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
/**
 * A range the chart offers: a number of days, or "all", All time (the owner,
 * 2026-11-11: "set up a all time option for the charts").
 */
export type ChartRange = (typeof CHART_RANGES)[number] | "all";

/** The longest range in days: the one read every other reader cuts from. */
export const CHART_FETCH: (typeof CHART_RANGES)[number] = 120;

/**
 * All time, asked for on its own when it is picked: every day from the
 * oldest visit to today, which the traffic route measures with daysSince
 * (lib/admin/dayWindow.ts, capped at two years). The shared read above stays
 * as it is for Home, Overview and the activity bell.
 */
export function trafficAllUrl(latest: "now" | "complete" = "now"): string {
  return `/api/admin/traffic?range=all&latest=${latest}`;
}

/**
 * Past this many days the chart draws weeks, not days: by then a day is about
 * two pixels wide on a phone and the line is noise.
 */
export const DAILY_UP_TO = 180;

type Day = { date: string; visitors: number; views: number; signups: number };

/**
 * A long window as weeks: seven days at a time, counted back from the newest,
 * so the last week ends on the last day and only the oldest may be shorter.
 * Each week is the mean of its days, a day's worth, the unit the daily chart
 * and its median line speak in; its date is the week's first day, and `days`
 * says how many days it holds.
 */
export function byWeek(points: readonly Day[]): (Day & { days: number })[] {
  const weeks: (Day & { days: number })[] = [];
  for (let end = points.length; end > 0; end -= 7) {
    const week = points.slice(Math.max(0, end - 7), end);
    const mean = (k: "visitors" | "views" | "signups") => Math.round((week.reduce((s, p) => s + p[k], 0) / week.length) * 10) / 10;
    weeks.unshift({ date: week[0].date, visitors: mean("visitors"), views: mean("views"), signups: mean("signups"), days: week.length });
  }
  return weeks;
}

/**
 * The one address the admin reads its days from. Home, Traffic's Overview,
 * the activity bell and the chart each used to ask for their own window (90
 * days three times, 120 once), and each window was counted on its own; one
 * address means the panel's live store asks once and all of them draw from
 * it (2026-11-04, with lib/admin/trafficSeries.ts). Every reader cuts the
 * last N days it wants from it.
 */
export function trafficUrl(latest: "now" | "complete" = "now"): string {
  return `/api/admin/traffic?range=${CHART_FETCH}d&latest=${latest}`;
}

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
