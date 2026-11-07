import STARTERS_FILE from "@/data/florilegium/starters.json";
import type { FlorilegiumItemInput } from "@/lib/florilegium/florilegium";
import { SEASON_PICTURE } from "@/lib/plans/season";
import { readAloudCover } from "@/lib/readAloud/covers";

/**
 * Starter collections for the Florilegium's first page (1.9, the owner's pick
 * for Keeping, A and C: "your collections and the sync line on top, the ready
 * collections below as tiles"; s5-06, "verbatim and cited").
 *
 * Four whole passages of Scripture the Church sings or reads whole, each as
 * the app's own Bible carries it, word for word (data/florilegium/starters.json,
 * held to data/bible by lib/florilegium/__tests__/starters.test.ts). A reader
 * keeps one as a collection of their own, a line a verse, each with its
 * reference, as if they had gathered the verses themselves.
 */

export type StarterLine = { verse: number; text: string };
export type Starter = {
  id: string;
  /** Its name's catalog key. Psalm 50 keeps the one the prayer rule already names it by. */
  nameKey: string;
  book: string;
  chapter: number;
  /** "theotokos" for the Theotokos's icon, else the book whose read-aloud cover it wears. */
  picture: string;
  lines: StarterLine[];
};

export const STARTERS: readonly Starter[] = STARTERS_FILE.starters;

/**
 * A starter's picture: the Theotokos, whose icon the apps carry, or its
 * book's cover, which they ask the website for, with the plate when it cannot
 * load (lib/readAloud/covers.ts).
 */
export function starterPicture(s: Starter): { src: string; fallback: string } {
  if (s.picture === "theotokos") return { src: SEASON_PICTURE, fallback: SEASON_PICTURE };
  const cover = readAloudCover(s.picture);
  return { src: cover.src, fallback: cover.fallback };
}

/** "John 1:1-18", with the reader's name for the book. */
export function starterReference(s: Starter, bookName: string): string {
  const first = s.lines[0]?.verse ?? 1;
  const last = s.lines[s.lines.length - 1]?.verse ?? first;
  return `${bookName} ${s.chapter}:${first}-${last}`;
}

/**
 * The lines as the Florilegium keeps a gathered verse. The store puts the
 * newest first, so they are handed over last verse first and read from the
 * first verse down.
 */
export function starterItems(s: Starter, bookName: string): FlorilegiumItemInput[] {
  return [...s.lines].reverse().map((l) => ({
    kind: "scripture" as const,
    text: l.text,
    reference: `${bookName} ${s.chapter}:${l.verse}`,
    book: s.book,
    chapter: s.chapter,
    verse: l.verse,
  }));
}
