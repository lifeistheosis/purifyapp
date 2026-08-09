// The interlinear may only ever show a reader the text they asked for.
//
// This exists because it did not. `data/bible/english-tagged/philemon/1.json`
// held Philemon 1-25 followed by Philippians 1:1-30, and the reader builds its
// token map as `englishTokensByNum[v.n] = v.tokens` (last write wins), so the
// English side of Philemon rendered Philippians. Nothing anywhere would have
// caught that: the file parsed, the types matched, the page rendered, and the
// only symptom was that the words were the wrong words.
//
// So the assertions below are about IDENTITY and BOUNDS, not shape:
//
//   1. Every file sits in a directory matching the `book` field inside it.
//      This is exactly what an ingest that carries an accumulator across a
//      book boundary gets wrong.
//   2. No chapter file numbers higher than the book's real chapter count.
//   3. No verse number exceeds the verse count of the corresponding English
//      chapter, which is what catches a second book's verses appended to the
//      end of a short one.
//   4. Any book that fails is blocked in lib/bible/interlinearBooks.ts, and
//      any book blocked there has no data left to serve.
//
// Rule 4 is the one that keeps this honest: it makes "delete the bad data" and
// "block the book" a single indivisible action, so a future regeneration
// cannot quietly unblock a book whose data is still wrong.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import booksJson from "@/data/bible/books.json";
import { blockedInterlinearBooks } from "../interlinearBooks";

const ROOT = process.cwd();
const TAGGED = path.join(ROOT, "data/bible/english-tagged");
const ORIGINAL = path.join(ROOT, "data/bible/original");

type BookMeta = { slug: string; testament: string; chapters: number };
const BOOKS = (
  Array.isArray(booksJson)
    ? booksJson
    : ((booksJson as { books?: unknown }).books ?? [])
) as BookMeta[];
const BY_SLUG = new Map(BOOKS.map((b) => [b.slug, b]));

function dirs(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function chapterFiles(root: string, slug: string): number[] {
  return fs
    .readdirSync(path.join(root, slug))
    .filter((f) => f.endsWith(".json"))
    .map((f) => Number(f.replace(".json", "")))
    .filter((n) => Number.isFinite(n));
}

function englishVerseCount(slug: string, chapter: number): number | null {
  const file = path.join(ROOT, "data/bible", slug, `${chapter}.json`);
  if (!fs.existsSync(file)) return null;
  const j = JSON.parse(fs.readFileSync(file, "utf8")) as {
    verses: { n: number }[];
  };
  return j.verses.length;
}

describe("interlinear data integrity", () => {
  it("every english-tagged file declares the book its directory names", () => {
    const offenders: string[] = [];
    for (const slug of dirs(TAGGED)) {
      for (const n of chapterFiles(TAGGED, slug)) {
        const j = JSON.parse(
          fs.readFileSync(path.join(TAGGED, slug, `${n}.json`), "utf8"),
        ) as { book?: string };
        if (j.book && j.book !== slug) {
          offenders.push(`english-tagged/${slug}/${n}.json declares "${j.book}"`);
        }
      }
    }
    expect(offenders, offenders.join("\n  ")).toEqual([]);
  });

  it("every original-language file declares the book its directory names", () => {
    const offenders: string[] = [];
    for (const slug of dirs(ORIGINAL)) {
      for (const n of chapterFiles(ORIGINAL, slug)) {
        const j = JSON.parse(
          fs.readFileSync(path.join(ORIGINAL, slug, `${n}.json`), "utf8"),
        ) as { book?: string };
        if (j.book && j.book !== slug) {
          offenders.push(`original/${slug}/${n}.json declares "${j.book}"`);
        }
      }
    }
    expect(offenders, offenders.join("\n  ")).toEqual([]);
  });

  it("no original-language chapter numbers past the book's real chapter count", () => {
    // This is the assertion that would have caught the 2 Maccabees
    // corruption. data/bible/original/2-maccabees/ held EIGHTEEN chapter
    // files for a book with fifteen, and all eighteen were 4 Maccabees. Every
    // file's `book` field said "2-maccabees", so the label check above passes
    // cleanly; only the count betrayed it.
    // Books where the Greek genuinely has more chapters than the English,
    // because the LXX divides them differently. These are correct data, not
    // corruption, and must not be "fixed" by deleting a file.
    //
    // joel: the LXX has four chapters. LXX Joel 3 is Brenton's Joel 2:28-32
    //   ("I will pour out my Spirit"), and LXX Joel 4 is Brenton's Joel 3.
    //   Serving these beside the English needs a chapter MAPPING, which
    //   loadOriginal does not have; until it does, the interlinear stays
    //   NT-only and none of this is reached.
    const VERSIFICATION_EXEMPT = new Set(["joel"]);

    const offenders: string[] = [];
    for (const slug of dirs(ORIGINAL)) {
      if (VERSIFICATION_EXEMPT.has(slug)) continue;
      const meta = BY_SLUG.get(slug);
      if (!meta) {
        offenders.push(`original/${slug} is not a book in books.json`);
        continue;
      }
      for (const n of chapterFiles(ORIGINAL, slug)) {
        if (n > meta.chapters) {
          offenders.push(
            `original/${slug}/${n}.json but ${slug} has ${meta.chapters} chapters`,
          );
        }
      }
    }
    expect(offenders, offenders.join("\n  ")).toEqual([]);
  });

  it("no english-tagged chapter numbers past the book's real chapter count", () => {
    const offenders: string[] = [];
    for (const slug of dirs(TAGGED)) {
      const meta = BY_SLUG.get(slug);
      if (!meta) {
        offenders.push(`english-tagged/${slug} is not a book in books.json`);
        continue;
      }
      for (const n of chapterFiles(TAGGED, slug)) {
        if (n > meta.chapters) {
          offenders.push(
            `english-tagged/${slug}/${n}.json but ${slug} has ${meta.chapters} chapters`,
          );
        }
      }
    }
    expect(offenders, offenders.join("\n  ")).toEqual([]);
  });

  it("no english-tagged verse numbers past the English chapter's length", () => {
    // The Philemon signature: a second book's verses appended to the end of a
    // shorter chapter, so the max `n` overshoots the real verse count.
    const offenders: string[] = [];
    for (const slug of dirs(TAGGED)) {
      for (const n of chapterFiles(TAGGED, slug)) {
        const expected = englishVerseCount(slug, n);
        if (expected == null) continue;
        const j = JSON.parse(
          fs.readFileSync(path.join(TAGGED, slug, `${n}.json`), "utf8"),
        ) as { verses: { n: number }[] };
        const max = Math.max(...j.verses.map((v) => v.n));
        if (max > expected) {
          offenders.push(
            `english-tagged/${slug}/${n}.json reaches v${max}, English has ${expected}`,
          );
        }
      }
    }
    expect(offenders, offenders.join("\n  ")).toEqual([]);
  });

  it("a blocked book ships no interlinear data at all", () => {
    // Blocking without deleting would leave the data one boolean away from
    // being served again; deleting without blocking would leave a Greek-only
    // half-interlinear. Both halves have to move together.
    const offenders: string[] = [];
    for (const slug of blockedInterlinearBooks()) {
      if (fs.existsSync(path.join(TAGGED, slug))) {
        offenders.push(`${slug} is blocked but data/bible/english-tagged/${slug} still exists`);
      }
    }
    expect(offenders, offenders.join("\n  ")).toEqual([]);
  });
});
