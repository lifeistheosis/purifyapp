// Client-safe half of the Verse of the Day module.
//
// `verseOfDay.ts` is `server-only` (it reads data/bible off disk), but the
// card that renders the verse is a client component, so the shape they pass
// between them and the key they agree on have to live somewhere neither
// side is forbidden to import.

/**
 * The card's flat, render-ready shape: everything the Verse of the Day card
 * draws, and nothing else. Deliberately not the full `VerseOfDay` (which
 * carries the whole loaded passage), because a table of these is serialised
 * into the Android bundle and every field is paid for once per day in the
 * window.
 */
export type VerseOfDayEntry = {
  label: string;
  /** The verse text, already joined and whitespace-normalised. */
  text: string | null;
  href: string;
  source: "gospel" | "epistle" | "ot" | "rotation";
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
};

/** "YYYY-MM-DD" in the UTC frame the calendar lookups use. */
export function verseDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
