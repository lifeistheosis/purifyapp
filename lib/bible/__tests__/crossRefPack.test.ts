// The cross-references as the apps carry them (1.9): each chapter's references
// packed, and the words of each verse they point to kept once in its book's file.

import { describe, expect, it } from "vitest";

import { chapterCrossRefFile, crossRefWordsFile, crossRefWordsFiles } from "@/lib/bible/chapterExtras";
import { booksPointedTo, packCrossRefs, unpackCrossRefs } from "@/lib/bible/crossRefPack";

describe("a chapter's cross-references, packed", () => {
  it("come back as the reader had them, words and all", async () => {
    for (const [book, chapter] of [["john", 1], ["psalms", 22], ["jeremiah", 38], ["romans", 8]] as const) {
      const refs = (await chapterCrossRefFile(book, chapter))!;
      const packed = packCrossRefs(refs);
      const words = new Map<string, Record<string, string> | null>();
      for (const b of booksPointedTo(packed)) words.set(b, await crossRefWordsFile(b));
      expect(unpackCrossRefs(packed, (b) => words.get(b) ?? null), `${book} ${chapter}`).toEqual(refs);
    }
  }, 300_000);

  it("weigh the whole Bible's references less than the New Testament's did with their words written out (7.2 MB)", async () => {
    let bytes = 0;
    const { allChapterParams } = await import("@/lib/bible/books");
    for (const { book, chapter } of allChapterParams()) {
      const refs = await chapterCrossRefFile(book, Number(chapter));
      if (refs) bytes += Buffer.byteLength(JSON.stringify(packCrossRefs(refs)));
    }
    for (const { file } of await crossRefWordsFiles()) bytes += Buffer.byteLength(JSON.stringify(await crossRefWordsFile(file.replace(/\.json$/, ""))));
    expect(bytes).toBeLessThan(7_200_000);
  }, 300_000);
});

// Fable's release check 1, B2: a browser that kept a 1.8 copy of a chapter's
// file hands it to 1.9. 1.8 wrote each reference out with its words, as the
// live site still serves them: {"1":[{"book":"john","chapter":17,"verse":5,"text":...}]}.
describe("a chapter's cross-references, in the file 1.8 wrote", () => {
  const old = {
    "1": [
      { book: "john", chapter: 17, verse: 5, text: "And now, O Father, glorify thou me" },
      { book: "genesis", chapter: 1, verse: 1, endVerse: 3, text: "In the beginning God created" },
    ],
    "3": [{ book: "colossians", chapter: 1, verse: 16, endVerse: 2, endChapter: 2, text: "For by him were all things created" }],
  };

  it("are read with the words they came with, and need no word file", () => {
    const asked: string[] = [];
    const refs = unpackCrossRefs(old, (b) => (asked.push(b), null));
    expect(refs[1]).toEqual([
      { book: "john", chapter: 17, verse: 5, text: "And now, O Father, glorify thou me" },
      { book: "genesis", chapter: 1, verse: 1, endVerse: 3, text: "In the beginning God created" },
    ]);
    expect(refs[3]).toEqual([{ book: "colossians", chapter: 1, verse: 16, endVerse: 2, endChapter: 2, text: "For by him were all things created" }]);
    expect(asked).toEqual([]);
    expect(booksPointedTo(old)).toEqual([]);
  });

  it("are read beside packed ones in the same file, and a written one without words takes them from its book", () => {
    const mixed = { "1": [["john", 1, 1], { book: "mark", chapter: 1, verse: 1 }] } as never;
    expect(booksPointedTo(mixed)).toEqual(["john", "mark"]);
    const words: Record<string, Record<string, string>> = { john: { "1:1": "In the beginning was the Word" }, mark: { "1:1": "The beginning of the gospel" } };
    expect(unpackCrossRefs(mixed, (b) => words[b] ?? null)[1]).toEqual([
      { book: "john", chapter: 1, verse: 1, text: "In the beginning was the Word" },
      { book: "mark", chapter: 1, verse: 1, text: "The beginning of the gospel" },
    ]);
  });

  it("never throw on what is neither shape", () => {
    const junk = { "1": [null, 7, "john", { chapter: 1 }, ["john", 3, 16]], "2": "x", "3": null } as never;
    expect(() => booksPointedTo(junk)).not.toThrow();
    expect(booksPointedTo(junk)).toEqual(["john"]);
    expect(unpackCrossRefs(junk, () => null)).toEqual({ 1: [{ book: "john", chapter: 3, verse: 16, text: "" }] });
    expect(unpackCrossRefs(null as never, () => null)).toEqual({});
    expect(booksPointedTo(null as never)).toEqual([]);
  });

  it("cannot break the reader or the Plus trial: both catch a file that cannot be read", async () => {
    const fs = await import("node:fs");
    const reader = fs.readFileSync("components/bible/ChapterReader.tsx", "utf8");
    const trial = fs.readFileSync("components/billing/plusTry/TryCrossRefs.tsx", "utf8");
    expect(reader).toContain("await loadChapterCrossRefs(book, chapter).catch(() => null)");
    expect(trial).toMatch(/loadChapterCrossRefs\(TRY_CHAPTER\.book, TRY_CHAPTER\.chapter\)\s*\.catch\(\(\) => null\)/);
  });
});
