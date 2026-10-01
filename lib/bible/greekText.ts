import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { BOOKS } from "./books";
import type { Chapter } from "./load";
import { pairingOffset } from "./septuagintPairing";

/**
 * The Greek of the whole Bible, for the Greek word study and for putting the
 * Septuagint beside the Old Testament (2026-09-30).
 *
 * data/bible/original holds the New Testament in Nestle's 1904 text (Strong's
 * numbers and Robinson's parsing) and the Old Testament in Swete's
 * Septuagint (Strong's numbers, no parsing), both public domain. The
 * Septuagint is the Church's Old Testament; Purify's English Old Testament is
 * Brenton's translation of it. Five books have no Greek here: Ezra, Esther,
 * 2 Maccabees, the Prayer of Manasseh and 2 Esdras.
 *
 * Swete and Brenton do not always divide the text alike (Exodus 7 and 8 split
 * in another place, a verse of the Hebrew stands in Brenton's Exodus 25 and
 * not in the Greek, Swete numbers a psalm's title as verses of its own), so
 * Greek is only ever set beside English, or linked verse by verse, where the
 * two are shown to pair: see greekAlignment.
 */

const ORIGINAL = path.join(process.cwd(), "data", "bible", "original");
const ENGLISH = path.join(process.cwd(), "data", "bible");

const TESTAMENT = new Map(BOOKS.map((b) => [b.slug, b.testament]));

/** Parsed chapter files, kept a while: a word study reads many. */
const cache = new Map<string, Chapter | null>();
const CACHE_MAX = 400;

async function read(file: string): Promise<Chapter | null> {
  if (cache.has(file)) return cache.get(file) ?? null;
  let parsed: Chapter | null = null;
  try {
    parsed = JSON.parse(await fs.readFile(file, "utf8")) as Chapter;
  } catch {
    parsed = null;
  }
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(file, parsed);
  return parsed;
}

export function greekChapter(book: string, chapter: number): Promise<Chapter | null> {
  return read(path.join(ORIGINAL, book, `${chapter}.json`));
}

export function englishChapter(book: string, chapter: number): Promise<Chapter | null> {
  return read(path.join(ENGLISH, book, `${chapter}.json`));
}

// ── Pairing the Greek with the English (lib/bible/septuagintPairing.ts) ──

const alignment = new Map<string, number | null>();

/**
 * How a chapter's Greek lines up with Purify's English: the number to add to
 * an English verse to find its Greek (0 nearly everywhere, 2 in Psalm 50), or
 * null where the two cannot be paired verse for verse and the Greek must not
 * stand beside the English. The New Testament always pairs: both sides are
 * numbered as the King James Version is.
 */
export async function greekAlignment(book: string, chapter: number): Promise<number | null> {
  if (TESTAMENT.get(book) === "NT") return 0;
  const key = `${book}:${chapter}`;
  if (alignment.has(key)) return alignment.get(key) ?? null;
  const [g, e] = await Promise.all([greekChapter(book, chapter), englishChapter(book, chapter)]);
  const result = g && e ? pairingOffset(book, g.verses, e.verses) : null;
  alignment.set(key, result);
  return result;
}

/** A chapter's Greek numbered as the English, a psalm's title verses left out. */
export function numberedAsEnglish(greek: Chapter, offset: number): Chapter {
  if (offset === 0) return greek;
  return { ...greek, verses: greek.verses.filter((v) => v.n > offset).map((v) => ({ ...v, n: v.n - offset })) };
}

// ── The word index ───────────────────────────────────────────────────────

export type WordEntry = {
  /** Every occurrence, counted per testament. */
  nt: number;
  ot: number;
  /** Each verse once, "book.chapter.verse", in canonical order. */
  verses: string[];
};

let index: Promise<Map<string, WordEntry>> | null = null;

/**
 * Strong's number to where it stands, built once per server from the Greek
 * files (about 580,000 tagged words) and kept. Canonical order: the books as
 * data/bible/books.json lists them, chapters and verses ascending.
 */
export function wordIndex(): Promise<Map<string, WordEntry>> {
  if (!index) {
    index = (async () => {
      const map = new Map<string, WordEntry>();
      for (const book of BOOKS) {
        const testament = book.testament === "NT" ? "nt" : "ot";
        for (let c = 1; c <= book.chapters; c += 1) {
          let chapter: Chapter | null = null;
          try {
            chapter = JSON.parse(await fs.readFile(path.join(ORIGINAL, book.slug, `${c}.json`), "utf8")) as Chapter;
          } catch {
            continue;
          }
          // Swete repeats a verse number where the Septuagint adds lines
          // (Proverbs 15 has 37 verses numbered to 33), so a verse is
          // listed once per number, not once per entry in the file.
          const seen = new Set<string>();
          for (const v of chapter.verses) {
            for (const t of v.tokens ?? []) {
              if (!t.s) continue;
              let entry = map.get(t.s);
              if (!entry) {
                entry = { nt: 0, ot: 0, verses: [] };
                map.set(t.s, entry);
              }
              entry[testament] += 1;
              const ref = `${book.slug}.${c}.${v.n}`;
              if (!seen.has(`${t.s} ${ref}`)) {
                seen.add(`${t.s} ${ref}`);
                entry.verses.push(ref);
              }
            }
          }
        }
      }
      return map;
    })().catch((e) => {
      index = null;
      throw e;
    });
  }
  return index;
}

export function testamentOf(book: string): "nt" | "ot" {
  return TESTAMENT.get(book) === "NT" ? "nt" : "ot";
}
