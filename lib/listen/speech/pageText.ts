"use client";

/**
 * The words a page shows, for the phone's voice to read (1.9, build 95 note
 * 25). A chapter's verses are the page's own (components/bible/ChapterReader,
 * DownloadedChapter); they are handed over here as the page opens, so Listen
 * reads exactly what the reader sees, in the Bible they read it in. Each verse
 * keeps the place it stands on the page (its anchor), so the verse being read
 * is lit there. Not reactive: Listen reads it when tapped.
 */

export type PageVerse = { text: string; n?: number; anchor?: string };

const pages = new Map<string, PageVerse[]>();
const waiting = new Map<string, Set<() => void>>();

/** The key of a chapter's page: the Bible it is shown in (null for the English) and the app's book and chapter. */
export function chapterKey(book: string, chapter: number, bible: string | null = null): string {
  return `${bible ?? "en"}:${book}/${chapter}`;
}

export function setPageVerses(key: string, verses: PageVerse[] | null): void {
  if (verses?.length) {
    pages.set(key, verses);
    const told = waiting.get(key);
    waiting.delete(key);
    for (const t of told ?? []) t();
  } else pages.delete(key);
}

export function pageVerses(key: string): PageVerse[] | null {
  return pages.get(key) ?? null;
}

/** The page's verses once it has handed them over (a page opening as a reading rolls on into it), or null after `ms`. */
export function whenPageVerses(key: string, ms = 4000): Promise<PageVerse[] | null> {
  const now = pages.get(key);
  if (now) return Promise.resolve(now);
  return new Promise((resolve) => {
    const told = waiting.get(key) ?? new Set<() => void>();
    const done = () => {
      clearTimeout(timer);
      told.delete(done);
      resolve(pages.get(key) ?? null);
    };
    const timer = setTimeout(done, ms);
    told.add(done);
    waiting.set(key, told);
  });
}

/** Where each piece of a spoken track stands on its page, by the track's address: the verse or paragraph to light. */
const anchors = new Map<string, (string | undefined)[]>();

export function rememberAnchors(src: string, list: (string | undefined)[]): void {
  anchors.set(src, list);
}

export function anchorsOf(src: string | null): (string | undefined)[] | null {
  return src ? (anchors.get(src) ?? null) : null;
}
