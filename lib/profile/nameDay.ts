// A reader's name day: the feast of the patron saint they chose.
//
// The day comes from the saint's first feast in Purify's own calendar
// (lib/saints/saints.ts feastDays, "January 30"), which is the
// commemoration a name day keeps. A reader on the Old Calendar keeps it
// thirteen days later by the civil date (profiles.calendar_reckoning), the
// same shift the rest of the app makes for commemorations.
//
// "Today" is generous on purpose: a name day is live while that date is
// today ANYWHERE on earth, from 14 hours before midnight UTC to 12 hours
// after the next one. The reader's own time zone is not something the server
// knows, and greeting someone a few hours early beats telling a reader in
// Sydney that their feast has not started when it has.
//
// Pure, so the profile, the greeting route and the tests agree.

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** "January 30" as a month index and day, or null for anything else. */
export function parseFeast(text: string | null | undefined): { month: number; day: number } | null {
  if (!text) return null;
  const m = /^\s*([A-Za-z]+)\s+(\d{1,2})\s*$/.exec(text);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  const day = Number(m[2]);
  if (month < 0 || day < 1 || day > 31) return null;
  return { month, day };
}

/** Julian to civil (Gregorian) difference for a year. */
function julianOffset(year: number): number {
  return year < 2100 ? 13 : year < 2200 ? 14 : 15;
}

/** The civil date (UTC midnight) of the feast in a given year. */
export function feastDate(feast: { month: number; day: number }, year: number, reckoning: "new" | "old"): Date {
  const d = new Date(Date.UTC(year, feast.month, feast.day));
  if (reckoning === "old") d.setUTCDate(d.getUTCDate() + julianOffset(year));
  return d;
}

export type NameDay = {
  /** The civil date of this year's (or the live) name day, YYYY-MM-DD. */
  date: string;
  /** The year the greeting counts against. */
  year: number;
  /** True while it is that date somewhere on earth. */
  today: boolean;
};

export function nameDay(
  feastDays: readonly string[] | null | undefined,
  reckoning: "new" | "old" | string | null | undefined,
  now: Date = new Date(),
): NameDay | null {
  const feast = parseFeast(feastDays?.[0]);
  if (!feast) return null;
  const rk = reckoning === "old" ? "old" : "new";
  const t = now.getTime();
  const y = now.getUTCFullYear();
  for (const year of [y - 1, y, y + 1]) {
    const start = feastDate(feast, year, rk).getTime();
    if (t >= start - 14 * HOUR && t < start + DAY + 12 * HOUR) {
      return { date: new Date(start).toISOString().slice(0, 10), year, today: true };
    }
  }
  // Not today: the next one, for the editor's "your name day is" line.
  let year = y;
  let start = feastDate(feast, year, rk).getTime();
  if (start + DAY + 12 * HOUR <= t) {
    year += 1;
    start = feastDate(feast, year, rk).getTime();
  }
  return { date: new Date(start).toISOString().slice(0, 10), year, today: false };
}
