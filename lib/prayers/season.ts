// Map a calendar date to the prayer registry's coarse liturgical season and
// fast flag, used to drive "Suggested for Today". Pure date math over the
// Orthodox calendar helpers — no fs, no "use client" — so it is safe to import
// from both the server hub and client discovery rails.

import {
  fastingStatus,
  orthodoxPascha,
  startOfDayUtc,
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

/** Whether the given date carries a fast (excludes normal & fast-free days). */
export function isFastDay(today: Date): boolean {
  const kind = fastingStatus(today).kind;
  return kind !== "normal" && kind !== "fast-free";
}
