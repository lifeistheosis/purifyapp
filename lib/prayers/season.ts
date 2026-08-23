// Map a calendar date to the prayer registry's coarse liturgical season and
// fast flag, used to drive "Suggested for Today". Pure date math over the
// Orthodox calendar helpers — no fs, no "use client" — so it is safe to import
// from both the server hub and client discovery rails.

import {
  fastingStatus,
  orthodoxPascha,
  shiftForStyle,
  startOfDayUtc,
  type CalStyle,
} from "@/lib/calendar/orthodox";
import type { Season } from "./rules";

const MS_PER_DAY = 86_400_000;

/** The registry season for a date: Great Lent, Pascha–Pentecost, or "any". */
export function seasonFor(today: Date): Season {
  const t = startOfDayUtc(today);
  const year = t.getUTCFullYear();
  // Check this year and last year so the paschal season (which can land in
  // either civil year relative to "now") resolves correctly.
  for (const y of [year, year - 1]) {
    const pascha = orthodoxPascha(y);
    const cleanMonday = new Date(pascha.getTime() - 48 * MS_PER_DAY);
    const pentecost = new Date(pascha.getTime() + 49 * MS_PER_DAY);
    if (t >= cleanMonday && t < pascha) return "lent";
    if (t >= pascha && t <= pentecost) return "pascha";
  }
  return "any";
}

/**
 * Whether the given date carries a fast (excludes normal and fast-free days).
 *
 * `style` is required. This asked fastingStatus for the CIVIL day, so an Old
 * Calendar reader was offered the wrong season's prayers: fasting suggestions
 * on a day they were not fasting, and none on a day they were. It went
 * unnoticed because lib/calendar/__tests__/oneReckoning.test.ts scanned only
 * `app` and `components`, and this file is in `lib`. That blind spot is now
 * closed, and this was the one thing hiding behind it.
 *
 * seasonFor above is deliberately NOT shifted: it derives from Pascha, and
 * both reckonings compute Pascha from the same algorithm, so shifting it
 * would move the paschal cycle twice.
 */
export function isFastDay(today: Date, style: CalStyle): boolean {
  const kind = fastingStatus(shiftForStyle(today, style)).kind;
  return kind !== "normal" && kind !== "fast-free";
}
