import type { ChapterInterlinear } from "./chapterExtras";
import type { CrossRefItem } from "./crossRefShape";
import type { ChapterCommentary } from "./load";
import type { StrongsEntry } from "./strongs";
import { booksPointedTo, unpackCrossRefs, type CrossRefWords, type StoredCrossRefs } from "./crossRefPack";
import { unpackInterlinear, type PackedInterlinear } from "./interlinearPack";

/**
 * The reader's side of a chapter's files (app/bible-data/): the Greek, the
 * lexicon, the cross-references and, in the apps, the commentary. Each is
 * fetched when it is asked for and not before, and a chapter that was read
 * once in this visit is not fetched again.
 *
 * The addresses are relative on purpose. They resolve against the page's own
 * origin: the website on the web, https://localhost inside the apps, where
 * the files are in the bundle and open with no network. That is why this is
 * plain fetch and not apiFetch, which goes to the server.
 */

// The lexicon is kept for the whole visit. Chapter files are kept for the
// last few chapters only: John 1's commentary alone is most of a megabyte,
// and a long night of reading should not hold every chapter it passed.
const KEEP = 8;
const STRONGS = "/bible-data/strongs.json";
const kept = new Map<string, Promise<unknown>>();

function read<T>(path: string, forever = false, decode?: (raw: unknown) => T): Promise<T | null> {
  const hit = kept.get(path);
  if (hit) {
    // Asked for again, so it is the newest once more.
    if (!forever) {
      kept.delete(path);
      kept.set(path, hit);
    }
    return hit as Promise<T | null>;
  }
  const asked = fetch(path)
    .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
    // Decoded once, inside the kept promise, so every ask gets the same object.
    .then((raw) => (raw === null ? null : decode ? decode(raw) : (raw as T)))
    .catch(() => null);
  kept.set(path, asked);
  // A miss is not kept: a phone that had no signal for one ask may have it for the next.
  void asked.then((v) => {
    if (v === null && kept.get(path) === asked) kept.delete(path);
  });
  if (!forever) {
    const chapters = [...kept.keys()].filter((k) => k !== STRONGS);
    for (const old of chapters.slice(0, Math.max(0, chapters.length - KEEP))) kept.delete(old);
  }
  return asked;
}

/** The Greek beside a chapter, or null when it has none or could not be read. */
export function loadInterlinear(book: string, chapter: number): Promise<ChapterInterlinear | null> {
  // The file packs each word as a short array (1.9, lib/bible/interlinearPack.ts).
  return read<ChapterInterlinear>(`/bible-data/interlinear/${book}/${chapter}.json`, false, (raw) =>
    unpackInterlinear(raw as PackedInterlinear),
  );
}

/** Strong's lexicon, keyed by the bare number a token carries. One file for every chapter. */
export function loadStrongs(): Promise<Record<string, StrongsEntry> | null> {
  return read<Record<string, StrongsEntry>>(STRONGS, true);
}

/**
 * A chapter's cross-references by verse, each with the words of the verse it
 * points to, or null. From 1.9 the chapter's file holds the references only
 * and each book's verses' words are a file of their own (lib/bible/crossRefPack.ts):
 * the words of the books pointed into are read beside it. A reference whose
 * book's words could not be read keeps its place, without its words.
 */
export async function loadChapterCrossRefs(book: string, chapter: number): Promise<Record<number, CrossRefItem[]> | null> {
  // Packed as 1.9 writes it, or a 1.8 copy a browser kept: both are read (crossRefPack.ts).
  const packed = await read<StoredCrossRefs>(`/bible-data/crossrefs/${book}/${chapter}.json`);
  if (!packed) return null;
  const books = booksPointedTo(packed);
  const words = new Map(await Promise.all(books.map(async (b) => [b, await read<CrossRefWords>(`/bible-data/crossref-words/${b}.json`)] as const)));
  return unpackCrossRefs(packed, (b) => words.get(b) ?? null);
}

/** The Fathers on a chapter by verse, or null. */
export function loadChapterCommentary(book: string, chapter: number): Promise<ChapterCommentary | null> {
  return read<ChapterCommentary>(`/bible-data/commentary/${book}/${chapter}.json`);
}

/** For tests: forget everything that was read. */
export function forgetChapterData(): void {
  kept.clear();
}
