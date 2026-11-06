import { describe, expect, it } from "vitest";

import { greekFor, taggedIndex } from "@/lib/bible/wordAlign";

// John 1:1 as the reader shows it, its English tags and its Greek (the
// shapes of /bible-data/interlinear): 1.9's tap on an English word.
const words = "In the beginning was the Word, and the Word was with God, and the Word was God.".split(" ");
const tags = [
  { w: "In", s: "1722" }, { w: "the", s: "746" }, { w: "beginning", s: "746" }, { w: "was", s: "2258" },
  { w: "the", s: "3056" }, { w: "Word,", s: "3056" }, { w: "and", s: "2532" }, { w: "the", s: "3056" },
  { w: "Word", s: "3056" }, { w: "was", s: "2258" }, { w: "with", s: "4314" }, { w: "God,", s: "2316" },
  { w: "and", s: "2532" }, { w: "the", s: "3056" }, { w: "Word", s: "3056" }, { w: "was", s: "2258" }, { w: "God.", s: "2316" },
];
const greek = [
  { w: "Ἐν", s: "1722" }, { w: "ἀρχῇ", s: "746" }, { w: "ἦν", s: "1510" }, { w: "ὁ", s: "3588" }, { w: "Λόγος", s: "3056" },
  { w: "καί", s: "2532" }, { w: "ὁ", s: "3588" }, { w: "Λόγος", s: "3056" }, { w: "ἦν", s: "1510" }, { w: "πρός", s: "4314" },
  { w: "τόν", s: "3588" }, { w: "Θεόν", s: "2316" }, { w: "καί", s: "2532" }, { w: "Θεὸς", s: "2316" }, { w: "ἦν", s: "1510" },
  { w: "ὁ", s: "3588" }, { w: "Λόγος", s: "3056" },
];

describe("an English word to its Greek", () => {
  it("finds the tag of a word where the two lists agree word for word", () => {
    expect(taggedIndex(words, tags, 5)).toBe(5);
  });

  it("gives each Word its own Λόγος, the second to the second", () => {
    expect(greekFor(tags, greek, 5)).toBe(4);
    expect(greekFor(tags, greek, 8)).toBe(7);
    expect(greekFor(tags, greek, 14)).toBe(16);
    // "the" of "the Word" is the same run: the same Λόγος.
    expect(greekFor(tags, greek, 4)).toBe(4);
  });

  it("gives no Greek for a word with no number", () => {
    expect(greekFor([{ w: "Amen.", s: null }], greek, 0)).toBeNull();
  });

  it("walks past a word one list has and the other does not, rather than guessing", () => {
    const more = [...tags.slice(0, 3), { w: "even", s: null }, ...tags.slice(3)];
    expect(taggedIndex(words, more, 5)).toBe(6);
    expect(taggedIndex(["Nothing", "here"], tags, 0)).toBeNull();
    expect(taggedIndex(words, tags, 99)).toBeNull();
  });
});
