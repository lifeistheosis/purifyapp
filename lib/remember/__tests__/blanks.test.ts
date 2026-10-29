import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { MAX_BLANKS, MIN_BLANK_LETTERS, blankCount, blankedWords } from "@/lib/remember/blanks";

// Remember the verse (1.8, the owner's "a mix of A and B with a good design"
// of round 16): the saved verse with some words left blank, the longer
// words, spread through it, and the same ones every time for that verse.

const JOHN_3_16 =
  "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";
const PSALM_23_1 = "The LORD is my shepherd; I shall not want.";
const blanks = (text: string) => blankedWords(text).filter((w) => w.blank).map((w) => w.word);
const letters = (word: string) => (word.match(/\p{L}/gu) ?? []).length;

describe("the blanks in a verse", () => {
  it("are the longer words, spread through it", () => {
    expect(blanks(JOHN_3_16)).toEqual(["loved", "begotten", "whosoever", "everlasting"]);
    // Nine words, two blanks: one from each half.
    expect(blanks(PSALM_23_1)).toEqual(["LORD", "shepherd"]);
  });

  it("are the same ones every time for the same verse", () => {
    const first = JSON.stringify(blankedWords(JOHN_3_16));
    for (let i = 0; i < 5; i++) expect(JSON.stringify(blankedWords(JOHN_3_16))).toBe(first);
    // Nothing random or dated decides them.
    expect(fs.readFileSync("lib/remember/blanks.ts", "utf8")).not.toMatch(/Math\.random|Date\.now|new Date/);
  });

  it("are never the short words, and about one word in six, at most six", () => {
    expect(blankCount(1)).toBe(1);
    expect(blankCount(25)).toBe(4);
    expect(blankCount(200)).toBe(MAX_BLANKS);
    const long =
      "Then were the king's scribes called at that time in the third month, that is, the month Sivan, on the three and twentieth day thereof; and it was written according to all that Mordecai commanded unto the Jews, and to the lieutenants, and the deputies and rulers of the provinces which are from India unto Ethiopia, an hundred twenty and seven provinces, unto every province according to the writing thereof, and unto every people after their language, and to the Jews according to their writing, and according to their language.";
    const words = blanks(long);
    expect(words).toHaveLength(MAX_BLANKS);
    for (const word of words) expect(letters(word)).toBeGreaterThanOrEqual(MIN_BLANK_LETTERS);
  });

  it("leave every word and its punctuation in place, so the verse reads whole once shown", () => {
    const words = blankedWords(JOHN_3_16);
    expect(words.map((w) => w.lead + w.word + w.tail).join(" ")).toBe(JOHN_3_16);
    // "world," keeps its comma outside the blank; "life." its full stop.
    expect(words.find((w) => w.word === "everlasting")).toMatchObject({ blank: true, tail: "" });
    expect(words.find((w) => w.word === "loved")).toMatchObject({ blank: true });
  });

  it("still ask for one word in a verse of short words, and none in no words", () => {
    expect(blanks("Jesus wept.")).toEqual(["Jesus"]);
    expect(blanks("I am he")).toEqual(["am"]);
    expect(blankedWords("   ")).toEqual([]);
  });
});
