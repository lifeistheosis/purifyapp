// A typed Bible reference, as rows for the one search.
//
// The corpus (./buildCorpus.ts) is a list, and a list can hold the 78 books
// but not every verse in them. So "john 3:16" found nothing in the app-wide
// search, while the Bible's own search bar opened it at once: the same
// reader, the same words, two answers depending on which box they typed in.
// This turns the query into rows the palette puts at the head of its Bible
// group, using the same parser as that search bar (lib/bible/books.ts,
// lib/bible/parseReferences.ts), so the two cannot disagree.
//
// Only a reference with a chapter in it becomes a row. A bare book name is
// left to the corpus, which already lists the books, and so are the passages
// known by name (Susanna, Bel and the Dragon), which are corpus rows too.
//
// A book is found by its name in the reader's own language as well as by its
// English one: "Ιωάννην 3:16", "Ioan 3:16" and "Juan 3:16" all open John 3.
//
// Loaded by the palette on first open rather than with the page: the palette
// is mounted on every screen and most readers never open it.

import { localBookNames, searchBible } from "@/lib/bible/books";
import {
  isMultiReferenceQuery,
  parseReferences,
  referenceHref,
  type Reference,
} from "@/lib/bible/parseReferences";
import type { SearchItem } from "./types";

type Translate = (key: string, replacements?: Record<string, string | number>) => string;
type TranslatePlural = (
  keyBase: string,
  count: number,
  replacements?: Record<string, string | number>,
) => string;

/** Each book's name in a language, by slug. */
export type LocalBooks = Readonly<Record<string, string>>;

/**
 * The most rows one query adds. "john 3" names John and 1 John, "cor 13" both
 * letters to Corinth; three leaves room for those and keeps a loose match
 * from pushing the rest of the results off a phone's first screen.
 */
const MOST = 3;

/** The reference at the end of a query: " 3", " 3:16", " 2:14-26". */
const TRAILING_REFERENCE = /\s+\d{1,3}(?::\d{1,3}(?:\s*[-–]\s*\d{1,3})?)?$/;

/** Lower case, no accents, letters and digits only. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The book the reader named, without its number: "1 cor 13:4" gives "cor",
 * "song of solomon 2" gives "song of solomon".
 */
function namedBook(query: string): string {
  return fold(query.trim().replace(TRAILING_REFERENCE, "")).replace(/^[1-4]\s*/, "").trim();
}

/** Whether some word of the book's name begins the way the reader typed it. */
function beginsAWord(bookName: string | undefined, typed: string): boolean {
  return !!bookName && typed.length > 0 && ` ${fold(bookName)}`.includes(` ${typed}`);
}

function label(ref: Reference, books: LocalBooks): string {
  const name = books[ref.book.slug] ?? ref.book.name;
  if (ref.kind === "verse") return `${name} ${ref.chapter}:${ref.verse}`;
  if (ref.kind === "range") return `${name} ${ref.chapter}:${ref.verseFrom}–${ref.verseTo}`;
  return `${name} ${ref.chapter}`;
}

function sublabel(ref: Reference, t: Translate, tn: TranslatePlural): string {
  if (ref.kind === "verse") {
    return t("bible.hitVerseSub", { verse: ref.verse, chapter: ref.chapter });
  }
  if (ref.kind === "range") {
    return tn("bible.hitRangeSub", ref.verseTo - ref.verseFrom + 1, {
      from: ref.verseFrom,
      to: ref.verseTo,
      chapter: ref.chapter,
    });
  }
  return t("bible.hitChapterSub", { chapter: ref.chapter, total: ref.book.chapters });
}

function key(ref: Reference): string {
  const at =
    ref.kind === "verse"
      ? `${ref.chapter}-${ref.verse}`
      : ref.kind === "range"
        ? `${ref.chapter}-${ref.verseFrom}-${ref.verseTo}`
        : `${ref.chapter}`;
  return `ref-${ref.book.slug}-${at}`;
}

/**
 * The references one query names, most likely first: a row per book it could
 * mean, three at most.
 */
export function referencesIn(query: string, books: LocalBooks = {}): Reference[] {
  const hits = searchBible(query, 8, {}, books).filter(
    // A passage found by its name is the corpus's to show, once.
    (h): h is Reference => h.kind !== "book" && !("passage" in h && h.passage),
  );
  // searchBible takes a book whose English name merely CONTAINS what was
  // typed, so "the 5" offered Esther and Matthew. Keep the books a word of
  // whose name begins that way, in English or in the reader's language. When
  // none does, the match came through an abbreviation ("mt 5", "jn 3"), which
  // is exact, and everything is kept.
  const typed = namedBook(query);
  const close = hits.filter(
    (h) => beginsAWord(h.book.name, typed) || beginsAWord(books[h.book.slug], typed),
  );
  return (close.length > 0 ? close : hits).slice(0, MOST);
}

export function referenceItems(
  rawQuery: string,
  t: Translate,
  tn: TranslatePlural,
): SearchItem[] {
  const query = rawQuery.trim();
  if (!query) return [];
  const books = localBookNames(t);

  // Several, parted by a comma or a semicolon: the single row the Bible's
  // search bar gives, all of them stacked on one page. That page reads the
  // same query with the same parser and the same book names.
  if (isMultiReferenceQuery(query)) {
    const refs = parseReferences(query, books);
    // "peter, paul" has a comma and no reference in it.
    if (refs.length === 0) return [];
    return [
      {
        id: "ref-multi",
        label: tn("bible.openReferences", refs.length),
        sublabel: refs.map((r) => label(r, books)).join(" · "),
        href: `/bible/multi?q=${encodeURIComponent(query)}`,
        group: "Bible",
      },
    ];
  }

  return referencesIn(query, books).map((ref) => ({
    id: key(ref),
    label: label(ref, books),
    sublabel: sublabel(ref, t, tn),
    href: referenceHref(ref),
    group: "Bible" as const,
  }));
}
