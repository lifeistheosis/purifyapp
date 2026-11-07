// Remember the verse in three steps (1.9, s4-06): missing words, then first
// letters, then from memory, as the verse moves up the boxes that already
// space it over the days.

import { describe, expect, it } from "vitest";

import { blankedWords, stepWords } from "@/lib/remember/blanks";
import { INTERVALS, stepOf } from "@/lib/remember/schedule";

const VERSE = "In the beginning was the Word, and the Word was with God, and the Word was God.";

describe("the three steps of remembering a verse", () => {
  it("follow its box: new or missed, the missing words; known twice, first letters; known four times, from memory", () => {
    expect([0, 1, 2, 3, 4, 5, INTERVALS.length + 1].map(stepOf)).toEqual([1, 1, 2, 2, 3, 3, 3]);
  });

  it("leave the longer words blank in the first, as the card always has", () => {
    expect(stepWords(VERSE, 1)).toEqual(blankedWords(VERSE));
    expect(stepWords(VERSE, 1).filter((w) => w.blank).length).toBeLessThan(stepWords(VERSE, 1).length);
  });

  it("leave every word blank in the second and the third, each keeping its first letter for the card to give", () => {
    for (const step of [2, 3] as const) {
      const words = stepWords(VERSE, step);
      expect(words.every((w) => w.blank)).toBe(true);
      expect(words.map((w) => w.first).join("")).toBe("ItbwtWatWwwGatWwG");
      expect(words.map((w) => w.lead + w.word + w.tail).join(" ")).toBe(VERSE);
    }
  });
});
