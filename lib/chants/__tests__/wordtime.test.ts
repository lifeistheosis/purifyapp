// The pure half of timing a chant's words word by word (build 86 note 78):
// scripts/chants/wordtime.mjs, which scripts/chants/time-words.mjs hands the
// speech model's findings to.

import { describe, expect, it } from "vitest";

import { lineWordTimes, readTiming } from "@/lib/chants/media";
import { timingSchema } from "@/lib/chants/schema";

import { cutLongLine, fold, heardWords, serializeTiming, similarity, wordTimes, wordsOf } from "../../../scripts/chants/wordtime.mjs";

describe("folding a word to compare it with what a speech model heard", () => {
  it("drops case, marks and stops, and makes alike what sounds alike", () => {
    expect(fold("Thy,", "en")).toBe("thy");
    expect(fold("Kyrie!", "fr")).toBe("kyrie");
    // Brenton's polytonic Greek and a model's monotonic spelling meet.
    expect(fold("Ἀλληλούϊα.", "el")).toBe(fold("Αλληλούια", "el"));
    expect(similarity(fold("Ἀλληλούϊα", "el"), fold("Αλληλούρια", "el"))).toBeGreaterThan(0.8);
    // Greek's many i's are one sound, and its two o's another.
    expect(fold("Κυρίῳ", "el")).toBe(fold("Κιρίο", "el"));
    // Arabic: no vowel marks, one alef.
    expect(fold("اِحْمَدُوا", "ar")).toBe(fold("احمدوا", "ar"));
    expect(fold("إلى", "ar")).toBe(fold("الي", "ar"));
    // Serbian in either alphabet.
    expect(fold("Hvalite", "sr")).toBe(fold("Хвалите", "sr"));
    expect(fold("Gospoda", "sr-Latn")).toBe(fold("Господа", "sr"));
  });
});

describe("which printed words the model's own hearing found", () => {
  it("lines the two up in order, a word heard as two or two as one", () => {
    const printed = wordsOf("Ἐξομολογεῖσθε τῷ Κυρίῳ, ὅτι χρηστός.");
    expect(heardWords(printed, wordsOf("Εξομολογείς τε το κύριο, οτι χρηστός."), "el")).toEqual([true, true, true, true, true]);
    expect(heardWords(wordsOf("O give thanks unto the Lord"), wordsOf("Give thanks to the Lord"), "en")).toEqual([
      false,
      true,
      true,
      false,
      true,
      true,
    ]);
  });

  it("finds nothing in nothing, and never a word that was not there", () => {
    expect(heardWords(["Alleluia."], [], "en")).toEqual([false]);
    expect(heardWords(wordsOf("for his mercy endureth for ever"), wordsOf("thank you"), "en").every((f) => !f)).toBe(true);
  });
});

describe("each word's start and end inside its line", () => {
  it("starts the first word with the line, and each word lasts until the next", () => {
    expect(wordTimes([10.4, 11, 12.5], 10, 14, 13.6)).toEqual([
      [10, 11],
      [11, 12.5],
      [12.5, 13.6],
    ]);
  });

  it("keeps every start inside the line and moving forward", () => {
    const t = wordTimes([3, 2, 30, 31], 10, 14);
    for (const [at, end] of t) {
      expect(at).toBeGreaterThanOrEqual(10);
      expect(end).toBeLessThanOrEqual(14);
      expect(end).toBeGreaterThanOrEqual(at);
    }
    t.slice(1).forEach(([at], k) => expect(at).toBeGreaterThan(t[k][0]));
  });

  it("cuts a line too long to hear at once where it is quietest, each piece with words", () => {
    const words = wordsOf("one two three four five six seven eight nine ten eleven twelve");
    const pieces = cutLongLine(words, 0, 60, 3, (a: number, b: number) => (a + b) / 2);
    expect(pieces).toHaveLength(3);
    expect(pieces.reduce((a: number, p: { count: number }) => a + p.count, 0)).toBe(words.length);
    expect(pieces[0].from).toBe(0);
    expect(pieces[2].to).toBe(60);
    for (const p of pieces) expect(p.count).toBeGreaterThan(0);
  });
});

describe("the version 2 timing file", () => {
  const timing = {
    v: 2,
    durationSec: 20,
    made: { by: "whisper-small.en_timestamped (q8)", on: "2026-10-31" },
    lines: [
      { at: 1, end: 4, text: "O give thanks", words: [[1, 1.4], [1.4, 2.2], [2.2, 4]], unheard: [0] },
      { at: 4, end: 7, text: "Alleluia.", words: [[4, 7]] },
    ],
  };

  it("is written a line to a line, and reads back as it was", () => {
    const text = serializeTiming(timing);
    expect(text.split("\n")).toHaveLength(5);
    expect(JSON.parse(text)).toEqual(timing);
    expect(timingSchema.safeParse(JSON.parse(text)).success).toBe(true);
  });

  it("is read beside version 1, and each line's word times only where they fit its words", () => {
    const read = readTiming(timing)!;
    expect(read.v).toBe(2);
    expect(lineWordTimes(read.lines[0], "O give thanks")).toEqual(timing.lines[0].words);
    // Words that do not match (another view, a line changed): the line's own time alone.
    expect(lineWordTimes(read.lines[0], "O give")).toBeUndefined();
    expect(lineWordTimes({ at: 0, end: 1, text: "a b", words: [[0.5, 0.6], [0.2, 0.3]] }, "a b")).toBeUndefined();
    expect(readTiming({ v: 1, durationSec: 5, lines: [{ at: 0, end: 1, text: "x" }] })?.v).toBe(1);
    expect(readTiming({ v: 3, durationSec: 5, lines: [] })).toBeNull();
  });
});
