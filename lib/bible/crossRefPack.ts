// The cross-references as the apps carry them (1.9, item 23 of
// docs/1.9-build/PLAN.md): each chapter's references in a short form, and the
// words of every verse they point to kept once, in one file for each book.
//
// Until 1.9 each chapter's file held its references with the words of each
// verse pointed to written out beside it, the same verse's words again in
// every chapter that points to it. That was 7.2 MB for the New Testament
// alone. With the Old Testament in (the Septuagint, through the verse map) it
// would have been 28 MB, past the room the apps have under their ceiling
// (lib/build/exportSize.ts). Kept once, the words of the 26,760 verses
// pointed to are 3.6 MB, and every chapter's references 2.9 MB: the whole
// Bible's references in less than the New Testament's were.
//
// Pure: no React, no window, no files.

import type { CrossRefItem } from "./crossRefShape";

/** A reference: [book, chapter, verse], with the range's last verse, and its chapter when the range runs into another. */
export type PackedCrossRef = [string, number, number] | [string, number, number, number] | [string, number, number, number, number];

/** A chapter's references, by verse. */
export type PackedCrossRefs = Record<string, PackedCrossRef[]>;

/** The words of a book's verses that references point to, by "chapter:verse". */
export type CrossRefWords = Record<string, string>;

export function packCrossRefs(refs: Record<number, CrossRefItem[]>): PackedCrossRefs {
  const out: PackedCrossRefs = {};
  for (const [verse, list] of Object.entries(refs)) {
    out[verse] = list.map((r): PackedCrossRef => {
      if (r.endVerse !== undefined && r.endChapter !== undefined) return [r.book, r.chapter, r.verse, r.endVerse, r.endChapter];
      if (r.endVerse !== undefined) return [r.book, r.chapter, r.verse, r.endVerse];
      return [r.book, r.chapter, r.verse];
    });
  }
  return out;
}

/**
 * A chapter's references with the words of each verse they point to, from the
 * books' word files. A verse whose words could not be had keeps its
 * reference, with no words.
 */
export function unpackCrossRefs(packed: PackedCrossRefs, wordsOf: (book: string) => CrossRefWords | null): Record<number, CrossRefItem[]> {
  const out: Record<number, CrossRefItem[]> = {};
  for (const [verse, list] of Object.entries(packed)) {
    if (!Array.isArray(list)) continue;
    out[Number(verse)] = list.map(([book, chapter, v, endVerse, endChapter]) => ({
      book,
      chapter,
      verse: v,
      ...(endVerse !== undefined ? { endVerse } : {}),
      ...(endChapter !== undefined ? { endChapter } : {}),
      text: wordsOf(book)?.[`${chapter}:${v}`] ?? "",
    }));
  }
  return out;
}

/** The books a chapter's references point into. */
export function booksPointedTo(packed: PackedCrossRefs): string[] {
  const books = new Set<string>();
  for (const list of Object.values(packed)) if (Array.isArray(list)) for (const [book] of list) books.add(book);
  return [...books];
}
