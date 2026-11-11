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

export type BibleId = "ru-synodal" | "grc-lxx-patriarchal" | "sr-danicic-karadzic" | "ar-van-dyck" | "es-reina-valera-1909" | "pt-almeida-1911";

export type DownloadableBible = {
  id: BibleId;
  /** The language its row is listed under, and the app's language it offers to switch to. */
  language: LocaleCode;
  /** The language of its words, for the page: Koine Greek is "grc", not the app's Modern Greek. */
  textLang: string;
  /** The direction its words run: the Arabic right to left, whatever the app's language. */
  dir: "ltr" | "rtl";
  /** How it numbers the Psalms: as the Septuagint, as the app does (Psalm 50 is "Have mercy"), or as the Hebrew and most Bibles (Psalm 51). */
  psalms: "septuagint" | "hebrew";
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

/**
 * In the order the list shows them: the owner's order of 2026-11-06 for the
 * first six (Romanian, Russian, Greek, Serbian, Arabic, Spanish), of the five
 * ready, and the Portuguese after them (call 23, 2026-11-11). The Serbian,
 * Arabic, Spanish and Portuguese are Bibles of the Hebrew canon, as their
 * publishers made them, and the line under each name says so
 * (bible.translationNote.<id>).
 */
export const DOWNLOADABLE_BIBLES: readonly DownloadableBible[] = [
  {
    id: "ru-synodal",
    language: "ru",
    textLang: "ru",
    dir: "ltr",
    psalms: "septuagint",
    title: "Синодальный перевод (1876)",
    shortLabel: "Синодальный",
    ...stats["ru-synodal"],
  },
  {
    id: "grc-lxx-patriarchal",
    language: "el",
    textLang: "grc",
    dir: "ltr",
    psalms: "septuagint",
    title: "Οι Εβδομήκοντα και το Πατριαρχικό κείμενο (1904)",
    shortLabel: "Ελληνικά",
    ...stats["grc-lxx-patriarchal"],
  },
  {
    id: "sr-danicic-karadzic",
    language: "sr",
    textLang: "sr",
    dir: "ltr",
    psalms: "hebrew",
    title: "Превод Вука Караџића и Ђуре Даничића (1868)",
    shortLabel: "Вук и Даничић",
    ...stats["sr-danicic-karadzic"],
  },
  {
    id: "ar-van-dyck",
    language: "ar",
    textLang: "ar",
    dir: "rtl",
    psalms: "hebrew",
    title: "ترجمة فاندايك (1865)",
    shortLabel: "فاندايك",
    ...stats["ar-van-dyck"],
  },
  {
    id: "es-reina-valera-1909",
    language: "es",
    textLang: "es",
    dir: "ltr",
    psalms: "hebrew",
    title: "Reina-Valera (1909)",
    shortLabel: "Reina-Valera",
    ...stats["es-reina-valera-1909"],
  },
  {
    // 1.9, call 23 (the owner's yes of 2026-11-11): Almeida's translation as
    // printed in 1911, verbatim in its spelling, labelled as the Spanish is.
    id: "pt-almeida-1911",
    language: "pt",
    textLang: "pt",
    dir: "ltr",
    psalms: "hebrew",
    title: "Almeida (1911)",
    shortLabel: "Almeida",
    ...stats["pt-almeida-1911"],
  },
];

export function downloadableBible(id: string | null | undefined): DownloadableBible | null {
  return DOWNLOADABLE_BIBLES.find((b) => b.id === id) ?? null;
}

/** Whether the Bible has the book: the Greek has no 2 Esdras, which survives in Latin, and the Bibles of the Hebrew canon none of the deuterocanonical books. */
export function hasBook(bible: DownloadableBible, book: string): boolean {
  return bible.books.includes(book);
}

/** "7.4 MB": a size as a phone's settings say it, in the reader's own number format. */
export function megabytes(bytes: number, locale: string): string {
  const mb = bytes / 1_000_000;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: mb < 10 ? 1 : 0 }).format(mb)} MB`;
}
