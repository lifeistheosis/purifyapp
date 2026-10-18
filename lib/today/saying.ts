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

import type { Cite, ShownCite } from "@/lib/citations/cite";

export type Saying = {
  text: string;
  attribution: string;
  /**
   * Where the words stand (1.8, lib/citations/cite.ts): a paragraph of the
   * library's Life of Antony or of St John Cassian's Conferences, word for
   * word.
   */
  cite: Cite;
  /**
   * The line under the saying as the card shows it, written from `cite`
   * when the file is written: the card chooses its saying on the device and
   * reads no other file. lib/citations/__tests__/quotes.test.ts holds the
   * two in step.
   */
  shown?: ShownCite;
};

/**
 * The sayings shown, every one traced. Those shown until 1.8, in wordings no
 * public-domain text the app carries has, wait in the file's `hidden` list
 * with where we looked, and are never shown.
 */
const SAYINGS: Saying[] = (sayings as unknown as { sayings: Saying[] }).sayings.filter((s) => s.cite.kind !== "untraced");

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
