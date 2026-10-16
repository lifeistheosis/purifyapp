import { orthodoxPascha } from "./pascha";

/**
 * The tone of the week: which of the eight tones of the Octoechos the
 * Church's Sunday and weekday hymns are sung in (1.7, for Chants).
 *
 * The cycle starts again every year on the Sunday of Thomas, the Sunday after
 * Pascha, in the first tone, and moves on one tone each Sunday: the Sunday of
 * the Myrrhbearers is in the second, the Sunday of All Saints (eight weeks
 * after Pascha) in the eighth, and so on round through the year until Lent's
 * last Sunday. A Sunday's tone holds for the week after it. In Bright Week
 * each day has its own tone, Pascha the first, Monday the second, and so on,
 * with the grave tone (the seventh) left out: Saturday is in the eighth. From
 * Palm Sunday through Holy Saturday the Octoechos is laid aside for the
 * hymns of the Passion, so the week has no tone.
 *
 * Pascha is reckoned alike on both calendars (both keep the Julian Paschalion,
 * lib/calendar/pascha.ts), so the tone is the same for every reader and needs
 * no calendar style.
 *
 * A day is a Date in the UTC-noon frame the calendar uses
 * (startOfDayLocal, lib/calendar/orthodox.ts): its UTC year, month and date
 * are the reader's own day.
 *
 * Today's "tone of the week" line is parked (the owner's answer 6 of
 * 2026-10-15); this feeds Chants only, and Today can take it up later.
 */
export type WeekTone = { tone: number; bright?: true };

const DAY_MS = 86_400_000;
/** Bright Week, Pascha to Saturday: the grave tone is not sung. */
const BRIGHT_WEEK = [1, 2, 3, 4, 5, 6, 8] as const;

function dayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY_MS);
}

function thomasSunday(year: number): number {
  return dayNumber(orthodoxPascha(year)) + 7;
}

export function toneOfWeek(date: Date): WeekTone | null {
  const day = dayNumber(date);
  const year = date.getUTCFullYear();
  const sincePascha = day - dayNumber(orthodoxPascha(year));
  if (sincePascha >= 0 && sincePascha <= 6) return { tone: BRIGHT_WEEK[sincePascha], bright: true };
  // Palm Sunday (seven days before Pascha) through Holy Saturday.
  if (sincePascha >= -7 && sincePascha <= -1) return null;
  // 1 January 1970 was a Thursday, so a day's weekday is (day + 4) mod 7,
  // Sunday 0. The Sunday on or before the day sets the week.
  const sunday = day - (((day + 4) % 7) + 7) % 7;
  const start = sunday >= thomasSunday(year) ? thomasSunday(year) : thomasSunday(year - 1);
  const weeks = Math.floor((sunday - start) / 7);
  return { tone: (((weeks % 8) + 8) % 8) + 1 };
}
