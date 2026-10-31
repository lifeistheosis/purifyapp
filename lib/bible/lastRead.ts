// Single source of truth for the "last chapter read" pointer kept in
// localStorage under `purify:bible:last`. The chapter reader writes it
// (ReadingProgressBar: the chapter as it opens, then the verse at the reading
// place as the reader scrolls), and it is read by the Bible tab, which opens
// on it (1.8, the owner's pick A of r3-20, "Straight into the book"), and by
// every "Continue reading" row.
//
// Shape is versionless and forward/backward-compatible: older payloads that
// only carried { book, bookName, chapter, ts } parse fine: `verse` defaults
// to 1 and `totalVerses` to 0, which the Continue card treats as "top of
// chapter, no progress hint".

import { useSyncExternalStore } from "react";

export type LastRead = {
  book: string;
  bookName: string;
  chapter: number;
  /** The verse at the reading place when the pointer was written. 1 = chapter top. */
  verse: number;
  /** Total verses in the chapter, for a progress hint. 0 = unknown. */
  totalVerses: number;
  /** Date.now() of the write. */
  ts: number;
};

/** Where a reader is in the Bible, as far as an address needs it. */
export type Place = Pick<LastRead, "book" | "chapter" | "verse">;

const KEY = "purify:bible:last";
const listeners = new Set<() => void>();

export function readLastRead(): LastRead | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object" || !p.book || !p.chapter) return null;
    return {
      book: String(p.book),
      bookName: String(p.bookName ?? p.book),
      chapter: Number(p.chapter),
      verse: Number.isFinite(Number(p.verse)) ? Number(p.verse) : 1,
      totalVerses: Number.isFinite(Number(p.totalVerses))
        ? Number(p.totalVerses)
        : 0,
      ts: Number(p.ts ?? 0),
    };
  } catch {
    return null;
  }
}

export function writeLastRead(v: LastRead): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* storage may be unavailable (private mode, quota) */
  }
  listeners.forEach((l) => l());
}

/** Told of every write, here and in another window of the website. */
export function subscribeLastRead(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

// ---------------------------------------------------------------------------
// The Bible tab's way in (1.8, r3-20 A): the tab is the chapter. It opens the
// chapter the reader left, at the verse; with nothing read yet, John 1, where
// the Church begins its Gospel (John 1:1-17 is the Gospel of Pascha) and the
// first door of the website's Begin where you stand (StartHereStrip).

/** The first chapter, for a reader who has read nothing yet. */
export const FIRST_PLACE: Place = { book: "john", chapter: 1, verse: 1 };
export const FIRST_PLACE_HREF = "/bible/john/1";

/** A book as the Bible's routes spell one: "john", "1-samuel". */
const BOOK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The address of a place: the chapter, and the verse when it is past the
 * first (the chapter lands on it: components/bible/VerseFocusFlash.tsx).
 * Null for a pointer that does not look like a chapter of a book: it is
 * whatever was in the device's storage, and never gets to name another
 * screen, or another site.
 */
export function placeHref(p: Place | null): string | null {
  if (!p || !BOOK.test(p.book) || !Number.isInteger(p.chapter) || p.chapter < 1) return null;
  const chapter = `/bible/${p.book}/${p.chapter}`;
  return Number.isInteger(p.verse) && p.verse > 1 ? `${chapter}#v${p.verse}` : chapter;
}

/** Where the Bible tab goes: the place the reader left, or John 1. */
export function bibleTabHref(last: Place | null): string {
  return placeHref(last) ?? FIRST_PLACE_HREF;
}

/**
 * The Bible tab's address, kept current as the reader reads. The static
 * pages carry John 1, the first visit's chapter; the device's own place
 * takes over as the page wakes (the place is on the phone, never in the
 * export).
 */
export function useBibleTabHref(): string {
  return useSyncExternalStore(
    subscribeLastRead,
    () => bibleTabHref(readLastRead()),
    () => FIRST_PLACE_HREF,
  );
}

/** The chapter an address is in, as a path with no slash at its end: "/bible/john/3". */
function chapterPath(address: string): string {
  return address.split("#")[0].split("?")[0].replace(/\/+$/, "") || "/";
}

/**
 * True when the Bible tab would only take the reader to the chapter they are
 * in. They are at their place already, so the tab goes nowhere: a move would
 * change nothing but the # under the same screen, and add a step to the
 * history the Android back button would seem to do nothing about (the same
 * as alreadyThere in lib/shortcuts/shortcuts.ts). `pathname` may end in a
 * slash, as the apps' addresses do.
 */
export function alreadyAtPlace(pathname: string, href: string): boolean {
  return chapterPath(pathname) === chapterPath(href) && chapterPath(href).startsWith("/bible/");
}

/**
 * The verse a chapter's address lands on: "#v16" is 16, a range "#v14-26"
 * its first, 14. The forms components/bible/VerseFocusFlash.tsx lands on;
 * null for anything else.
 */
export function verseOfHash(hash: string): number | null {
  const m = /^#v(\d+)(?:-(\d+))?$/.exec(hash);
  if (!m) return null;
  const from = Number(m[1]);
  return Number.isInteger(from) && from >= 1 ? from : null;
}

/**
 * The verse kept as a chapter opens (the owner's note 68 of 2026-10-31). An
 * address that lands on a verse keeps that verse, whatever the landing's
 * glide passes on its way; a chapter opened with no verse keeps the verse
 * the reader had in it, if the place is in it already (come back to by the
 * way back, say); any other chapter is kept from its top. Only the reader's
 * own scroll moves it after that (components/bible/ReadingProgressBar.tsx).
 */
export function arrivalVerse(
  prev: Place | null,
  at: { book: string; chapter: number },
  landing: number | null,
): number {
  if (landing !== null && Number.isInteger(landing) && landing >= 1) return landing;
  if (prev && prev.book === at.book && prev.chapter === at.chapter && Number.isInteger(prev.verse) && prev.verse >= 1) {
    return prev.verse;
  }
  return 1;
}
