// A saying of the Desert Fathers, chosen by the day.
//
// WHY THIS EXISTS
//
// The daily hook dead-ends most of the year. Probed against commemorationsOn
// and getSaint using the resolution in ChurchTodayRail, over 365 days of 2026
// only 60 resolve to a profiled saint and 305 fall back to a name, a ✦ and a
// link to the calendar grid. Theophany, the Synaxis of the Forerunner, the
// Circumcision and St Sava are all misses. Five days out of six, the front
// door of the app has nothing to read.
//
// data/today/sayings.json was written for exactly this and never imported.
// Its own header says so: "used as a fallback on Today when the headline saint
// has no entry in the registry's quotes array, rotated by day-of-year so the
// same line does not appear two days running."
//
// The saying is NOT presented as the commemorated saint's words. It renders in
// its own card, under its own heading, with the Father named on it. Attributing
// Abba Anthony to whoever happens to be commemorated is precisely the failure
// docs/editorial-standards.md forbids.

import sayings from "@/data/today/sayings.json";

export type Saying = {
  text: string;
  attribution: string;
};

const SAYINGS: Saying[] = (sayings as { sayings: Saying[] }).sayings;

/** Day of the year, 0-based, in the reader's own calendar day. */
function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const here = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((here - start) / 86_400_000);
}

/**
 * The saying for a given day.
 *
 * Deterministic, so it does not change under the reader while they are looking
 * at it, and does not differ between the server shell and the client. Rotates
 * by day of year, which with twelve sayings means a cycle of twelve days.
 *
 * Returns null only if the corpus is empty, so a caller can render nothing
 * rather than a placeholder, per the editorial rule on empty sections.
 */
export function sayingForDay(day: Date): Saying | null {
  if (SAYINGS.length === 0) return null;
  return SAYINGS[dayOfYear(day) % SAYINGS.length];
}

/** Every saying, for tests and for a future index. */
export function allSayings(): Saying[] {
  return SAYINGS;
}
