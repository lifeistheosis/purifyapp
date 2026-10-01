// The Old Testament's word-by-word tags (scripts/tag-septuagint-english.mjs,
// 2026-10-01): Brenton's English with the Strong's number of the Greek word
// each linked word answers, so a Greek word in the interlinear lights its
// English one. The reader trusts these files the way it trusts the New
// Testament's, so they are held to the same rule as interlinearData.test.ts:
// identity and bounds. A tag may be missing; it may never be wrong about which
// text it belongs to.

import fs from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { BOOKS } from "@/lib/bible/books";
import { pairingOffset } from "@/lib/bible/septuagintPairing";

type Token = { w: string; s?: string };
type Verse = { n: number; text: string; tokens?: Token[] };
type Chapter = { book?: string; chapter?: number; verses: Verse[] };

const DATA = path.join(process.cwd(), "data", "bible");
const TAGGED = path.join(DATA, "english-tagged");

const read = (file: string): Chapter | null => (fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Chapter) : null);

/** Every Old Testament chapter that has tags, with its English and Greek. */
function taggedChapters() {
  const out: { book: string; chapter: number; tagged: Chapter; english: Chapter; greek: Chapter | null }[] = [];
  for (const b of BOOKS.filter((x) => x.testament !== "NT")) {
    const dir = path.join(TAGGED, b.slug);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const chapter = Number(f.replace(".json", ""));
      out.push({
        book: b.slug,
        chapter,
        tagged: read(path.join(dir, f))!,
        english: read(path.join(DATA, b.slug, f))!,
        greek: read(path.join(DATA, "original", b.slug, f)),
      });
    }
  }
  return out;
}

/** The reader's count: consecutive words with one number are one phrase. */
function phrases(tokens: Token[]): Map<string, number> {
  const counts = new Map<string, number>();
  let prev: string | undefined;
  for (const t of tokens) {
    if (t.s && t.s !== prev) counts.set(t.s, (counts.get(t.s) ?? 0) + 1);
    prev = t.s;
  }
  return counts;
}

// Read in setup, not at import: 2,400 files read while the test file loads
// keep vitest's worker from answering its pool, and it fails to start.
let chapters: ReturnType<typeof taggedChapters> = [];
beforeAll(() => {
  chapters = taggedChapters();
}, 300_000);

describe("the Septuagint's English tags", () => {
  it("exist for the paired chapters, and only those", () => {
    expect(chapters.length).toBeGreaterThan(700);
    const offenders = chapters
      .filter((c) => !c.greek || pairingOffset(c.book, c.greek.verses, c.english.verses) === null)
      .map((c) => `${c.book} ${c.chapter}`);
    expect(offenders, offenders.join(", ")).toEqual([]);
  }, 120_000);

  it("carry each verse's English word for word, and every verse", () => {
    const offenders: string[] = [];
    for (const c of chapters) {
      const english = new Map(c.english.verses.map((v) => [v.n, v.text.trim().split(/\s+/).join(" ")]));
      if (c.tagged.book !== c.book || c.tagged.verses.length !== english.size) offenders.push(`${c.book} ${c.chapter}: verses`);
      for (const v of c.tagged.verses) {
        const words = (v.tokens ?? []).map((t) => t.w).join(" ");
        if (english.get(v.n) !== words) offenders.push(`${c.book} ${c.chapter}:${v.n}`);
      }
    }
    expect(offenders.slice(0, 20), offenders.slice(0, 20).join("\n")).toEqual([]);
  }, 120_000);

  it("never light more phrases for a word than the Greek verse has of it", () => {
    const offenders: string[] = [];
    for (const c of chapters) {
      const offset = pairingOffset(c.book, c.greek!.verses, c.english.verses) ?? 0;
      const greekBy = new Map(c.greek!.verses.map((v) => [v.n, v]));
      for (const v of c.tagged.verses) {
        const greek = new Map<string, number>();
        for (const t of greekBy.get(v.n + offset)?.tokens ?? []) if (t.s) greek.set(t.s, (greek.get(t.s) ?? 0) + 1);
        for (const [s, n] of phrases(v.tokens ?? [])) {
          if (n > (greek.get(s) ?? 0)) offenders.push(`${c.book} ${c.chapter}:${v.n} ${s} x${n}`);
          // The article's "the" belongs to its noun's phrase, never alone.
          if (s === "3588") offenders.push(`${c.book} ${c.chapter}:${v.n} article tagged`);
        }
      }
    }
    expect(offenders.slice(0, 20), offenders.slice(0, 20).join("\n")).toEqual([]);
  }, 120_000);

  it("light the words a reader would check first", () => {
    const tagOf = (book: string, chapter: number, verse: number, word: string) =>
      read(path.join(TAGGED, book, `${chapter}.json`))!
        .verses.find((v) => v.n === verse)!
        .tokens!.find((t) => t.w.replace(/[^\p{L}]/gu, "") === word)?.s;
    // "In the beginning God made the heaven and the earth."
    expect(tagOf("genesis", 1, 1, "God")).toBe("2316");
    expect(tagOf("genesis", 1, 1, "beginning")).toBe("746");
    expect(tagOf("genesis", 1, 1, "heaven")).toBe("3772");
    // Psalm 50 is paired past its title: English 1 is Greek 3.
    expect(tagOf("psalms", 50, 1, "God")).toBe("2316");
    // "The Lord tends me as a shepherd" (Psalm 22).
    expect(tagOf("psalms", 22, 1, "Lord")).toBe("2962");
  });
});
