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
