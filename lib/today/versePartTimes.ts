import measured from "@/data/today/verse-part-times.json";

/**
 * Where the part of a chosen verse is in its chapter's recording (2.0). A
 * Verse of the Day too long for its card shows part of its verse
 * (lib/today/versePicks.ts, `part`), and the recordings are timed by whole
 * verses, so the part's own start and end are measured from the sound once
 * (scripts/verse-part-times.py) and shipped here: Listen then plays what
 * the card shows (his word, 2026-11-28: "when you click play it starts
 * playing the whole verse rather than what you see").
 *
 * Found by the verse and the very words shown, so a part that changes, or
 * one that came after this file was made (a pick in a content pack), has no
 * times and is heard whole: more of Scripture than was shown, never less.
 */
const TIMES: Readonly<Record<string, { at: number; end: number }>> = measured.times;

/** The key a part is measured under: its verse, then its words. */
export function versePartKey(book: string, chapter: number, verse: number, words: string): string {
  return `${book}.${chapter}.${verse}:${words}`;
}

/** The seconds to hear for the words a card shows of a verse, or null to hear the whole verse. */
export function versePartCut(book: string, chapter: number, verse: number, shown: string | null | undefined): { at: number; end: number } | null {
  if (!shown) return null;
  const found = TIMES[versePartKey(book, chapter, verse, shown)];
  return found ? { at: found.at, end: found.end } : null;
}
