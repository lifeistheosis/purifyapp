import picksJson from "@/data/today/verse-picks.json";

/**
 * The chosen Verse of the Day.
 *
 * No Church body publishes a verse of the day. What is official is the daily
 * readings, and from 1.6 the app follows an official list of those
 * (lib/calendar/officialReadings.ts). The verse is Purify's own pick out of
 * that day's reading, by the owner's rule of 2026-10-10, and every pick is
 * his to approve before it is shown: data/today/verse-picks.json holds the
 * approved ones and nothing else.
 *
 * A day with no pick is not an error. lib/today/verseOfDay.ts falls back to
 * the first verse of the day's Gospel, which is what every day showed before
 * there was a list.
 *
 * Client-safe: no filesystem and no `server-only`, so the tests and the card
 * can both import it. The words themselves are loaded by verseOfDay.ts.
 */

export type VersePick = {
  /** Bible book slug, as in /bible/<book>/<chapter>. */
  book: string;
  chapter: number;
  verse: number;
  /**
   * "reading": a line of that day's own Epistle or Gospel.
   * "related": the day's reading had no line that fits, and Purify chose a
   * verse on its theme from elsewhere in Scripture. The card then carries no
   * Gospel or Epistle mark, because the verse is not from the reading.
   */
  from: "reading" | "related";
  /**
   * Shown in place of the whole verse, for a verse too long to stand on a
   * card. An exact piece of the verse, never a rewording: the test opens the
   * Bible and fails on a single letter of difference.
   */
  part?: string;
};

export const VERSE_PICKS: Readonly<Record<string, VersePick>> = (
  picksJson as unknown as { picks: Record<string, VersePick> }
).picks;

/** The approved pick for a civil date (YYYY-MM-DD), or null. */
export function versePickFor(dayKey: string): VersePick | null {
  return VERSE_PICKS[dayKey] ?? null;
}

/**
 * The words a pick shows, given its whole verse as our Bible has it.
 *
 * A part that is not found in the verse is not shown: the whole verse is.
 * The test keeps that from happening, and if it ever does, a reader sees
 * more of Scripture than was meant, never words that are not there.
 */
export function shownVerse(whole: string, pick: Pick<VersePick, "part">): string {
  const text = whole.replace(/\s+/g, " ").trim();
  return pick.part && text.includes(pick.part) ? pick.part : text;
}
