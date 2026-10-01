import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { BOOKS } from "./books";
import type { Chapter } from "./load";

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

// ── Pairing the Greek with the English ────────────────────────────────────

/** Letters only: the two editions punctuate and space differently. */
function letters(text: string): number {
  return text.replace(/[^\p{L}]/gu, "").length;
}

/** Swete opens a psalm's text with a word in capitals (ΕΛΕΗΣΟΝ in Psalm 50). */
function opensInCapitals(text: string): boolean {
  const word = (text.trim().split(/\s+/)[0] ?? "").replace(/[^\p{L}]/gu, "");
  return word.length >= 2 && word === word.toUpperCase() && word !== word.toLowerCase();
}

/**
 * How many verses Swete gives a psalm's title before its text begins. A short
 * title shares verse 1 with the first line, as in Purify's English; a long
 * one stands as a verse or two of its own (Psalm 50: the title is 1 and 2,
 * "Have mercy on me, O God" is 3), which the English, giving no titles,
 * does not count.
 */
function titleVerses(book: string, greek: Chapter): number {
  if (book !== "psalms") return 0;
  const i = greek.verses.findIndex((v) => opensInCapitals(v.text));
  return i > 0 && i <= 2 ? greek.verses[i].n - 1 : 0;
}

// The length check. Matching verse numbers are not enough: Brenton's Exodus 25
// carries a verse of the Hebrew that the Greek lacks and drops one later, so
// the numbers agree while most of the chapter stands a verse apart. A verse's
// Greek and its English run long or short together, so a shift shows in the
// lengths. Gale and Church's alignment (1993) finds the likeliest pairing of
// two runs of lengths; the chapter is paired verse for verse only when that
// pairing is one to one throughout.
//
// Tuned on this corpus, 2026-09-30: of the 858 Old Testament chapters whose
// numbers agree, it keeps 805 and refuses the shifted ones read side by side
// (Exodus 25, Tobit 5, the Song 6, Judith 16, 1 Samuel 21), while keeping
// chapters where only a clause sits across a verse boundary (Job 17:2-3,
// Psalm 129:4-5). The variance comes from the corpus; the odds favour one to
// one strongly, because the numbers already agree.
const VARIANCE = 2.5;
const STEPS: readonly (readonly [number, number, number])[] = [
  [1, 1, -Math.log(0.98)],
  [2, 1, -Math.log(0.009)],
  [1, 2, -Math.log(0.009)],
  [1, 0, -Math.log(0.001)],
  [0, 1, -Math.log(0.001)],
];

/** The complementary error function (Numerical Recipes, error below 1.2e-7). */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
    );
  return x >= 0 ? r : 2 - r;
}

/** How unlikely it is that `greek` letters of Greek became `english` of English. */
function lengthCost(greek: number, english: number, ratio: number): number {
  const mean = (greek * ratio + english) / 2;
  if (mean === 0) return Infinity;
  const z = Math.abs(greek * ratio - english) / Math.sqrt(VARIANCE * mean);
  return -Math.log(Math.max(erfc(z / Math.SQRT2), 1e-300));
}

/** True when pairing each verse with its own number is the likeliest pairing
 *  of the two runs of lengths, given in the same order. */
export function pairsOneToOne(greek: readonly number[], english: readonly number[]): boolean {
  const n = greek.length;
  if (n === 0 || n !== english.length) return false;
  const ratio = english.reduce((a, b) => a + b, 0) / greek.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(ratio) || ratio === 0) return false;
  const cost = Array.from({ length: n + 1 }, () => new Float64Array(n + 1).fill(Infinity));
  const step = Array.from({ length: n + 1 }, () => new Int8Array(n + 1).fill(-1));
  cost[0][0] = 0;
  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j <= n; j += 1) {
      for (let k = 0; k < STEPS.length; k += 1) {
        const [a, b, odds] = STEPS[k];
        if (i < a || j < b || cost[i - a][j - b] === Infinity) continue;
        let g = 0;
        let e = 0;
        for (let x = 1; x <= a; x += 1) g += greek[i - x];
        for (let y = 1; y <= b; y += 1) e += english[j - y];
        const c = cost[i - a][j - b] + odds + lengthCost(g, e, ratio);
        // Strictly cheaper only, so a tie stays one to one (tried first).
        if (c < cost[i][j]) {
          cost[i][j] = c;
          step[i][j] = k;
        }
      }
    }
  }
  for (let i = n; i > 0; i -= 1) if (step[i][i] !== 0) return false;
  return true;
}

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
  let result: number | null = null;
  if (g && e) {
    const offset = titleVerses(book, g);
    const greek = g.verses.filter((v) => v.n > offset);
    const byEnglish = new Map(greek.map((v) => [v.n - offset, v.text]));
    const sameNumbers = greek.length === e.verses.length && e.verses.every((v) => byEnglish.has(v.n));
    if (
      sameNumbers &&
      pairsOneToOne(
        e.verses.map((v) => letters(byEnglish.get(v.n) ?? "")),
        e.verses.map((v) => letters(v.text)),
      )
    ) {
      result = offset;
    }
  }
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
