// The Greek beside a chapter, packed for its file (1.9, the full optimize):
// every chapter that carries it packs and unpacks to exactly what the reader
// drew before, through the JSON its file is, and the old shape still reads.

import { describe, expect, it } from "vitest";

import { chapterInterlinear, chapterOfFile, interlinearFiles } from "@/lib/bible/chapterExtras";
import { packInterlinear, packWord, unpackInterlinear, unpackWord } from "@/lib/bible/interlinearPack";

describe("a word", () => {
  it("packs to its values in a short array and back", () => {
    expect(packWord({ w: "ἀρχῇ", s: "746", p: "N-DSF" })).toEqual(["ἀρχῇ", "746", "N-DSF"]);
    expect(packWord({ w: "In", s: "1722" })).toEqual(["In", "1722"]);
    expect(packWord({ w: "·" })).toEqual(["·"]);
    expect(packWord({ w: "καὶ", p: "CONJ" })).toEqual(["καὶ", "", "CONJ"]);
    expect(unpackWord(["καὶ", "", "CONJ"])).toEqual({ w: "καὶ", p: "CONJ" });
    expect(unpackWord({ w: "Λόγος", s: "3056", p: "N-NSM" })).toEqual({ w: "Λόγος", s: "3056", p: "N-NSM" });
  });
});

describe("every chapter's Greek", () => {
  it(
    "comes back from its file exactly as the reader drew it, word for word",
    async () => {
      const files = await interlinearFiles();
      expect(files.length).toBeGreaterThan(1000);
      let words = 0;
      for (const { book, file } of files) {
        const chapter = chapterOfFile(file)!;
        const drawn = await chapterInterlinear(book, chapter);
        expect(drawn, `${book} ${chapter}`).not.toBeNull();
        const onTheWire = JSON.parse(JSON.stringify(packInterlinear(drawn!)));
        expect(unpackInterlinear(onTheWire), `${book} ${chapter}`).toEqual(drawn);
        // A tab still holding the old shape reads it as it is.
        expect(unpackInterlinear(JSON.parse(JSON.stringify(drawn)))).toEqual(drawn);
        for (const v of Object.values(drawn!.tokens)) words += v.length;
      }
      expect(words).toBeGreaterThan(100_000);
    },
    300_000,
  );

  it("is smaller packed", async () => {
    const drawn = (await chapterInterlinear("john", 1))!;
    const before = JSON.stringify(drawn).length;
    const after = JSON.stringify(packInterlinear(drawn)).length;
    expect(after).toBeLessThan(before * 0.85);
  });
});
