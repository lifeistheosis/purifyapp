// The Bibles a reader can download (1.9, item 21 of docs/1.9-build/PLAN.md).
//
// The owner, 2026-11-07: "make it so that the user picks to download the
// selected Bible they pick. (other Bible apps do this we need this) instead
// of the app including all of them downloaded already". So no Bible but the
// English is in the apps: each of these is a file for each of its books on
// the website (public/bibles/, made by scripts/bibles/build.mjs), downloaded
// to the phone when the reader asks for it (./store.ts), and read on the
// website straight from there. The apps carry only this list and its sizes
// (data/bibles/catalog.json, written by the same script).
//
// Each reads in its own numbering, chapters and verses as its edition prints
// them (./page.ts says how a page shows them). What each is and where it
// comes from: docs/1.9-build/BIBLES.md.
//
// Pure: no React, no window.

import STATS from "@/data/bibles/catalog.json";
import type { LocaleCode } from "@/lib/i18n/locales";

export type BibleId = "ru-synodal" | "grc-lxx-patriarchal";

export type DownloadableBible = {
  id: BibleId;
  /** The language its row is listed under, and the app's language it offers to switch to. */
  language: LocaleCode;
  /** The language of its words, for the page: Koine Greek is "grc", not the app's Modern Greek. */
  textLang: string;
  /** Its name as its readers know it, kept as written: a proper name, not copy. */
  title: string;
  /** The computer's toolbar pill. */
  shortLabel: string;
  /** Its version on the website when this app was built: a hash of its words. */
  version: string;
  /** Its books' files together, in bytes, as the phone keeps them. */
  bytes: number;
  /** The app's books it has (data/bible/books.json slugs). */
  books: readonly string[];
};

type Stats = Record<BibleId, { version: string; bytes: number; books: string[] }>;
const stats = STATS as Stats;

/** In the order the list shows them: the owner's order of 2026-11-06 for the first six (Russian, then Greek, of the two ready). */
export const DOWNLOADABLE_BIBLES: readonly DownloadableBible[] = [
  {
    id: "ru-synodal",
    language: "ru",
    textLang: "ru",
    title: "Синодальный перевод (1876)",
    shortLabel: "Синодальный",
    ...stats["ru-synodal"],
  },
  {
    id: "grc-lxx-patriarchal",
    language: "el",
    textLang: "grc",
    title: "Οι Εβδομήκοντα και το Πατριαρχικό κείμενο (1904)",
    shortLabel: "Ελληνικά",
    ...stats["grc-lxx-patriarchal"],
  },
];

export function downloadableBible(id: string | null | undefined): DownloadableBible | null {
  return DOWNLOADABLE_BIBLES.find((b) => b.id === id) ?? null;
}

/** Whether the Bible has the book: the Greek has no 2 Esdras, which survives in Latin. */
export function hasBook(bible: DownloadableBible, book: string): boolean {
  return bible.books.includes(book);
}

/** "7.4 MB": a size as a phone's settings say it, in the reader's own number format. */
export function megabytes(bytes: number, locale: string): string {
  const mb = bytes / 1_000_000;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: mb < 10 ? 1 : 0 }).format(mb)} MB`;
}
