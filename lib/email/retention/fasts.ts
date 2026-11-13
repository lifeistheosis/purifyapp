import { JULIAN_OFFSET_DAYS, type CalStyle } from "@/lib/calendar/orthodox";
import { orthodoxPascha } from "@/lib/calendar/pascha";

/**
 * The four fasts of the year as runs of civil days, for the fasting
 * companion. Pure.
 *
 * Each is drawn from the same anchors fastingStatus reads
 * (lib/calendar/orthodox.ts), split the same way: what is counted from Pascha
 * (Great Lent, the start of the Apostles' Fast) falls on the same civil day
 * in both reckonings, because both keep the same Pascha; what is fixed in
 * the menaion (the Nativity and Dormition fasts, the end of the Apostles'
 * Fast) falls thirteen days later by the civil date for a reader on the Old
 * Calendar. lib/email/retention/__tests__/fasts.test.ts walks every day of
 * four years in both reckonings and holds these runs to fastingStatus, day
 * for day, so the companion can never speak of a fast the calendar does not
 * show.
 *
 * Days are whole UTC days, as everything server-side reads them: the job runs
 * at 11:00 UTC, when the Americas, Europe and most of Asia share one date.
 */

export type FastId = "nativity" | "great_lent" | "apostles" | "dormition";

export const FAST_IDS: readonly FastId[] = ["nativity", "great_lent", "apostles", "dormition"];

/** Each fast's name as the calendar's season banner gives it, set to open a sentence or a heading. */
export const FAST_TITLE: Record<FastId, string> = {
  nativity: "The Nativity Fast",
  great_lent: "Great Lent",
  apostles: "The Apostles' Fast",
  dormition: "The Dormition Fast",
};

const DAY = 86_400_000;

/** A civil day as a whole number of UTC days since 1970. */
export function dayNumber(d: Date): number {
  return Math.floor(d.getTime() / DAY);
}

/** The civil day of a day number, at noon UTC, the frame lib/calendar/orthodox.ts reads in. */
export function dayOf(n: number): Date {
  return new Date(n * DAY + DAY / 2);
}

/** One fast in one year: its first and last civil day as day numbers, inclusive. */
export type FastRun = { id: FastId; key: string; first: number; last: number };

/** Every run that begins in the civil year `year` in this reckoning, and the Nativity Fast of the year before. */
function runsAround(year: number, style: CalStyle): FastRun[] {
  const shift = style === "old" ? JULIAN_OFFSET_DAYS : 0;
  const fixed = (y: number, month: number, day: number) => dayNumber(new Date(Date.UTC(y, month, day))) + shift;
  const pascha = dayNumber(orthodoxPascha(year));
  const runs: FastRun[] = [
    // 15 November to 24 December on the Church's calendar. On the Old
    // Calendar it runs into January, so last year's can still be under way.
    { id: "nativity", key: `nativity-${year - 1}`, first: fixed(year - 1, 10, 15), last: fixed(year - 1, 11, 24) },
    { id: "nativity", key: `nativity-${year}`, first: fixed(year, 10, 15), last: fixed(year, 11, 24) },
    // Clean Monday to Holy Saturday, with Holy Week, as fastingStatus has it.
    { id: "great_lent", key: `great_lent-${year}`, first: pascha - 48, last: pascha - 1 },
    // 1 to 14 August.
    { id: "dormition", key: `dormition-${year}`, first: fixed(year, 7, 1), last: fixed(year, 7, 14) },
  ];
  // The Monday after All Saints to 28 June. In a year with a late Pascha on
  // the New Calendar the start falls after the end, and there is no fast.
  const apostlesFirst = pascha + 57;
  const apostlesLast = fixed(year, 5, 28);
  if (apostlesFirst <= apostlesLast) runs.push({ id: "apostles", key: `apostles-${year}`, first: apostlesFirst, last: apostlesLast });
  return runs;
}

export type FastDay = FastRun & {
  /** From 0 on the fast's first day. */
  dayIndex: number;
  /** From 0 in the fast's first seven days. */
  week: number;
  /** How many days the fast has. */
  length: number;
};

/** The fast under way on this civil day in this reckoning, or null. */
export function fastOn(day: Date, style: CalStyle): FastDay | null {
  const n = dayNumber(day);
  const year = day.getUTCFullYear();
  for (const run of runsAround(year, style)) {
    if (n < run.first || n > run.last) continue;
    const dayIndex = n - run.first;
    return { ...run, dayIndex, week: Math.floor(dayIndex / 7), length: run.last - run.first + 1 };
  }
  return null;
}

/** The civil days of one week of a fast, from its first day of that week to the seventh or the fast's last. */
export function weekDays(fast: FastRun, week: number): Date[] {
  const from = fast.first + week * 7;
  const to = Math.min(fast.last, from + 6);
  const out: Date[] = [];
  for (let n = from; n <= to; n++) out.push(dayOf(n));
  return out;
}

/** The days from today to the seventh day on, or the fast's last. */
export function daysAhead(fast: FastRun, today: Date): Date[] {
  const from = Math.max(fast.first, dayNumber(today));
  const to = Math.min(fast.last, from + 6);
  const out: Date[] = [];
  for (let n = from; n <= to; n++) out.push(dayOf(n));
  return out;
}
