/**
 * The figures and the two weeks the admin's Home draws (the owner's pick A,
 * "One home", 2026-10-28): what needs him, then the money and the visitors
 * with a chart each, so the daily check ends there.
 *
 * Everything here is cut from payloads the panel already polls: the revenue
 * series from /api/admin/overview, the daily visitors from
 * /api/admin/traffic?range=90d. Nothing is read for the Home alone. All the
 * days are UTC days, the bucket every admin route counts in.
 *
 * Pure: no fetch and no clock read. The clock comes in as an argument.
 */

/**
 * Where a figure could not be read. A word, never a dash: the old Today drew
 * an em dash here, and "not measured" is what the mark always meant.
 */
export const NOT_MEASURED = "Not measured";

/** While a figure's first read is still on the wire. */
export const LOADING = "…";

/** A figure, or the word for why there is none. Null is "not read", never zero. */
export function figure(v: number | null | undefined, loading: boolean): number | string {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return loading ? LOADING : NOT_MEASURED;
}

const DAY_MS = 86_400_000;

/** The UTC day `back` days before `now`, as "YYYY-MM-DD". */
export function utcDay(now: Date, back = 0): string {
  return new Date(now.getTime() - back * DAY_MS).toISOString().slice(0, 10);
}

/** A UTC day's short weekday: "2026-10-28" is "Wed". */
export function weekday(day: string): string {
  const t = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(t)) return day;
  return new Date(t).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
}

export type VisitorDay = { day: string; visitors: number; weekBefore: number };

/**
 * The last seven days of visitors, each beside the same day a week earlier.
 *
 * The design drew today hour by hour against yesterday. No route the admin
 * calls counts visitors by the hour, so the Home draws the same comparison a
 * day at a time: this week in ink, the week before in grey. `points` is the
 * traffic route's daily series, oldest first, ending on today. A day missing
 * from it counts as none.
 */
export function visitorWeeks(points: readonly { date: string; visitors: number }[]): VisitorDay[] {
  if (points.length === 0) return [];
  const byDay = new Map(points.map((p) => [p.date, p.visitors]));
  const last = points[points.length - 1].date;
  const lastT = Date.parse(`${last}T00:00:00Z`);
  if (Number.isNaN(lastT)) return [];
  const end = new Date(lastT);
  const out: VisitorDay[] = [];
  for (let back = 6; back >= 0; back--) {
    const day = utcDay(end, back);
    out.push({ day, visitors: byDay.get(day) ?? 0, weekBefore: byDay.get(utcDay(end, back + 7)) ?? 0 });
  }
  return out;
}

export type MoneyDay = { day: string; cents: number };

/**
 * The last seven days of money and their sum. `series` is the overview
 * route's daily net, oldest first, its last point today. Null when there is
 * no week in it: an unread series is not a week of zeros.
 */
export function moneyWeek(series: readonly number[], now: Date): { days: MoneyDay[]; totalCents: number } | null {
  if (series.length < 7) return null;
  const week = series.slice(-7);
  const days = week.map((cents, i) => ({ day: utcDay(now, 6 - i), cents }));
  return { days, totalCents: week.reduce((s, c) => s + c, 0) };
}

/** The three marks under a week's bars: its first day, its middle, and today. */
export function weekAxis(days: readonly { day: string }[]): [string, string, string] | null {
  if (days.length < 3) return null;
  return [weekday(days[0].day), weekday(days[Math.floor(days.length / 2)].day), "today"];
}
