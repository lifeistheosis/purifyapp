// The King James Version's numbering to the app's, verse by verse (1.9, item
// 22 of docs/1.9-build/PLAN.md).
//
// The app's Old Testament is the Septuagint in Brenton's English, numbered as
// the Septuagint is; most of the world's Bibles, and the data made for them
// (OpenBible's cross-references), number it as the KJV does. The map is made
// from the two texts' words by scripts/bibles/verse-map.mjs and kept in
// data/bible/kjv-to-lxx.json: for each Old Testament book, the KJV verses that
// stand elsewhere in the app, and the ones the app's Septuagint does not have
// (or that could not be placed surely). Every other verse is at the same
// number, and the New Testament is numbered alike in both.
//
// Server and build code only: the file is 62 KB, and nothing on a reader's
// screen needs it (the cross-references are written in the app's numbering
// before they ship).

import MAP from "@/data/bible/kjv-to-lxx.json";

type BookMap = { moved: Record<string, string>; missing: string[] };

const BOOKS = (MAP as { books: Record<string, BookMap> }).books;
const MISSING = new Map(Object.entries(BOOKS).map(([book, m]) => [book, new Set(m.missing)]));

export type VersePlace = { chapter: number; verse: number };

/**
 * Where a KJV-numbered verse is in the app: the Septuagint's number for an
 * Old Testament verse (the KJV's Jeremiah 31:31 is 38:31, its Psalm 23:1 is
 * 22:1), the same number in the New Testament; null when the app's
 * Septuagint does not have it.
 */
export function fromKjv(book: string, chapter: number, verse: number): VersePlace | null {
  const map = BOOKS[book];
  if (!map) return { chapter, verse };
  const key = `${chapter}:${verse}`;
  if (MISSING.get(book)?.has(key)) return null;
  const to = map.moved[key];
  if (!to) return { chapter, verse };
  const [c, v] = to.split(":").map(Number);
  return { chapter: c, verse: v };
}

/** The Old Testament books the map covers: the KJV's thirty-nine. */
export function mappedBooks(): string[] {
  return Object.keys(BOOKS);
}
