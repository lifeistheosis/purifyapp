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
 * A reference as a chapter's file may hold it: packed, as 1.9 writes it, or
 * written out with its words, as 1.8 wrote it. A browser that kept a 1.8
 * copy of a file (the website's cache, a service worker) hands that copy to
 * 1.9, so both are read (Fable's release check 1, B2), as interlinearPack.ts
 * reads both shapes of a word.
 */
export type StoredCrossRef = PackedCrossRef | CrossRefItem;

/** A chapter's references by verse, in either shape. */
export type StoredCrossRefs = Record<string, StoredCrossRef[]>;

/** A 1.8 reference: the words came with it. */
function isWritten(r: unknown): r is CrossRefItem {
  return typeof r === "object" && r !== null && !Array.isArray(r) && typeof (r as CrossRefItem).book === "string";
}

function unpackRef(r: StoredCrossRef, wordsOf: (book: string) => CrossRefWords | null): CrossRefItem | null {
  if (Array.isArray(r)) {
    const [book, chapter, verse, endVerse, endChapter] = r;
    if (typeof book !== "string") return null;
    return {
      book,
      chapter,
      verse,
      ...(endVerse !== undefined ? { endVerse } : {}),
      ...(endChapter !== undefined ? { endChapter } : {}),
      text: wordsOf(book)?.[`${chapter}:${verse}`] ?? "",
    };
  }
  if (!isWritten(r)) return null;
  const { book, chapter, verse, endVerse, endChapter, text } = r;
  return {
    book,
    chapter,
    verse,
    ...(endVerse !== undefined ? { endVerse } : {}),
    ...(endChapter !== undefined ? { endChapter } : {}),
    text: typeof text === "string" ? text : (wordsOf(book)?.[`${chapter}:${verse}`] ?? ""),
  };
}

/**
 * A chapter's references with the words of each verse they point to, from the
 * books' word files (or, in a 1.8 file, from the reference itself). A verse
 * whose words could not be had keeps its reference, with no words; anything
 * in the file that is neither shape is left out rather than thrown on.
 */
export function unpackCrossRefs(packed: StoredCrossRefs, wordsOf: (book: string) => CrossRefWords | null): Record<number, CrossRefItem[]> {
  const out: Record<number, CrossRefItem[]> = {};
  if (typeof packed !== "object" || packed === null) return out;
  for (const [verse, list] of Object.entries(packed)) {
    if (!Array.isArray(list)) continue;
    out[Number(verse)] = list.map((r) => unpackRef(r, wordsOf)).filter((r): r is CrossRefItem => r !== null);
  }
  return out;
}

/** The books whose word files a chapter's references need: those packed without their words. */
export function booksPointedTo(packed: StoredCrossRefs): string[] {
  const books = new Set<string>();
  if (typeof packed !== "object" || packed === null) return [];
  for (const list of Object.values(packed)) {
    if (!Array.isArray(list)) continue;
    for (const r of list) {
      if (Array.isArray(r)) {
        if (typeof r[0] === "string") books.add(r[0]);
      } else if (isWritten(r) && typeof r.text !== "string") books.add(r.book);
    }
  }
  return [...books];
}
