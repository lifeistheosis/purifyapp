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
// Loaded by the palette on first open rather than with the page: the palette
// is mounted on every screen and most readers never open it.

import { searchBible } from "@/lib/bible/books";
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

/**
 * The most rows one query adds. "john 3" names John and 1 John, "cor 13" both
 * letters to Corinth; three leaves room for those and keeps a loose match
 * from pushing the rest of the results off a phone's first screen.
 */
const MOST = 3;

/** The reference at the end of a query: " 3", " 3:16", " 2:14-26". */
const TRAILING_REFERENCE = /\s+\d{1,3}(?::\d{1,3}(?:\s*[-–]\s*\d{1,3})?)?$/;

/**
 * The book the reader named, without its number: "1 cor 13:4" gives "cor",
 * "song of solomon 2" gives "song of solomon".
 */
function namedBook(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(TRAILING_REFERENCE, "")
    .replace(/\./g, "")
    .replace(/^[1-3]\s*/, "")
    .trim();
}

/** Whether some word of the book's name begins the way the reader typed it. */
function beginsAWord(bookName: string, typed: string): boolean {
  return typed.length > 0 && ` ${bookName.toLowerCase()}`.includes(` ${typed}`);
}

function bookName(ref: Reference, t: Translate): string {
  const key = `bible.books.${ref.book.slug}`;
  const local = t(key);
  // The catalog answers a missing key with the key itself.
  return local === key ? ref.book.name : local;
}

function label(ref: Reference, t: Translate): string {
  const name = bookName(ref, t);
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
 * The references a query names, most likely first.
 *
 * One reference gives a row per book it could mean. Several, parted by a
 * comma or a semicolon, give the single row the Bible's search bar gives:
 * all of them stacked on one page.
 */
export function referencesIn(query: string): Reference[] {
  const hits = searchBible(query, 8).filter(
    // A passage found by its name is the corpus's to show, once.
    (h): h is Reference => h.kind !== "book" && !("passage" in h && h.passage),
  );
  // searchBible takes a book whose name merely CONTAINS what was typed, so
  // "the 5" offered Esther and Matthew. Keep the books a word of whose name
  // begins that way. When none does, the match came through an abbreviation
  // ("mt 5", "jn 3"), which is exact, and everything is kept.
  const typed = namedBook(query);
  const close = hits.filter((h) => beginsAWord(h.book.name, typed));
  return (close.length > 0 ? close : hits).slice(0, MOST);
}

export function referenceItems(
  rawQuery: string,
  t: Translate,
  tn: TranslatePlural,
): SearchItem[] {
  const query = rawQuery.trim();
  if (!query) return [];

  if (isMultiReferenceQuery(query)) {
    const refs = parseReferences(query);
    // "peter, paul" has a comma and no reference in it.
    if (refs.length === 0) return [];
    return [
      {
        id: "ref-multi",
        label: tn("bible.openReferences", refs.length),
        sublabel: refs.map((r) => label(r, t)).join(" · "),
        href: `/bible/multi?q=${encodeURIComponent(query)}`,
        group: "Bible",
      },
    ];
  }

  return referencesIn(query).map((ref) => ({
    id: key(ref),
    label: label(ref, t),
    sublabel: sublabel(ref, t, tn),
    href: referenceHref(ref),
    group: "Bible" as const,
  }));
}
