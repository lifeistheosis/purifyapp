import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { getBook } from "@/lib/bible/books";

/**
 * The Hebrew beside the Old Testament (1.9, the Discord's "Add Hebrew", on
 * the arbiter's word: the Hebrew beside the Old Testament books as the Greek
 * is beside the New, a study aid; the Church's Old Testament is the
 * Septuagint, and Purify's English Old Testament is Brenton's translation of
 * it).
 *
 * The text is the Westminster Leningrad Codex, public domain, pointed and
 * without cantillation, a word written and not read in brackets before the
 * word read (scripts/bibles/hebrew-extract.py writes data/bible/hebrew/). It
 * stands beside a verse of the app only where the verse map places it
 * (data/bibles/maps/he-wlc.json, scripts/bibles/compare-map.mjs: the
 * Copenhagen Alliance's numberings and the verses' lengths, as for Compare).
 * The map leaves out what it cannot place surely, and nothing is guessed: a
 * verse it leaves out says so, and so does a chapter. Only what is sure is
 * said to be missing from the Hebrew: its whole books, and the three chapters
 * the Septuagint alone has (Psalm 151, Susanna and Bel).
 */

const DATA = path.join(process.cwd(), "data", "bible");

/** The chapters of books the Hebrew has that the Hebrew does not: the Septuagint's own. */
const NOT_IN_HEBREW: Readonly<Record<string, readonly number[]>> = {
  psalms: [151],
  daniel: [13, 14],
};

/**
 * "shown": the Hebrew stands beside this chapter's verses. "book": the book is
 * not in the Hebrew Bible. "chapter": this chapter is not (NOT_IN_HEBREW).
 * "apart": the Hebrew has it, but it and the Septuagint do not answer verse
 * for verse here, so it is not set beside it. "none": not an Old Testament
 * chapter.
 */
export type HebrewState = "shown" | "book" | "chapter" | "apart" | "none";

/** One verse's Hebrew: its own place in the Hebrew ("23:1", "21:1-2") and its words. */
export type HebrewLine = [ref: string, text: string];

/** The Hebrew beside one chapter: by the app's verse, and the runs of the app's verses beside which none stands. */
export type ChapterHebrew = {
  verses: Record<number, HebrewLine>;
  apart: [from: number, to: number][];
};

type Run = [number, number, number, number] | [number, number, number, number, number];
type MapFile = { books: Record<string, Record<string, Run[]>> };
type BookFile = { chapters: [number, string][][] };

let mapRead: Promise<MapFile> | null = null;
function readMap(): Promise<MapFile> {
  mapRead ??= fs.readFile(path.join(DATA, "..", "bibles", "maps", "he-wlc.json"), "utf8").then((raw) => JSON.parse(raw) as MapFile);
  return mapRead;
}

const booksRead = new Map<string, Promise<BookFile | null>>();
function readBook(slug: string): Promise<BookFile | null> {
  let read = booksRead.get(slug);
  if (!read) {
    read = fs
      .readFile(path.join(DATA, "hebrew", `${slug}.json`), "utf8")
      .then((raw) => JSON.parse(raw) as BookFile)
      .catch(() => null);
    booksRead.set(slug, read);
  }
  return read;
}

/** Whether the Hebrew stands beside this chapter, and if not, why. */
export async function hebrewState(book: string, chapter: number): Promise<HebrewState> {
  const b = getBook(book);
  if (!b || b.testament !== "OT") return "none";
  if (!(await readBook(book))) return "book";
  if (NOT_IN_HEBREW[book]?.includes(chapter)) return "chapter";
  const map = await readMap();
  return map.books[book]?.[String(chapter)]?.length ? "shown" : "apart";
}

/** The Hebrew beside a chapter the map places, or null where it stands beside none of it. */
export async function chapterHebrew(book: string, chapter: number, verseNumbers: readonly number[]): Promise<ChapterHebrew | null> {
  if ((await hebrewState(book, chapter)) !== "shown") return null;
  const [map, file] = await Promise.all([readMap(), readBook(book)]);
  if (!file) return null;
  const text = (c: number, v: number): string | null => file.chapters[c - 1]?.find(([n]) => n === v)?.[1] ?? null;
  const verses: Record<number, HebrewLine> = {};
  for (const r of map.books[book]?.[String(chapter)] ?? []) {
    for (let a = r[0]; a <= r[1]; a++) {
      if (r.length === 5) {
        // One app verse that the Hebrew divides in two.
        const parts: string[] = [];
        for (let v = r[3]; v <= r[4]; v++) {
          const t = text(r[2], v);
          if (t) parts.push(t);
        }
        if (parts.length) verses[a] = [`${r[2]}:${r[3]}-${r[4]}`, parts.join(" ")];
        continue;
      }
      const v = r[3] + (a - r[0]);
      const t = text(r[2], v);
      if (t) verses[a] = [`${r[2]}:${v}`, t];
    }
  }
  // The app's verses beside which no Hebrew stands, as runs.
  const apart: [number, number][] = [];
  for (const n of verseNumbers) {
    if (verses[n]) continue;
    const last = apart.at(-1);
    if (last && verseNumbers.indexOf(last[1]) === verseNumbers.indexOf(n) - 1) last[1] = n;
    else apart.push([n, n]);
  }
  return { verses, apart };
}
