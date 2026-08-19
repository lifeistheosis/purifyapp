// The lemma verifier is what stands between the commentary rail and a note
// anchored at a verse that does not exist. It is calibrated, not tuned: the
// constants below were fixed by running the Catena Aurea ingest against Mark,
// whose correct output is already known and shipped, and the full oracle is
//
//   node scripts/ingest-catena-aurea.mjs --book mark
//
// which must report 679 of 679 lemmas verified and leave
// data/bible/commentary/mark/ byte-identical. That oracle needs the CCEL
// volume, so it cannot run in CI. These tests are what CI can hold: the
// constants, the tokeniser, and the two behaviours the whole design rests on,
// all against the Scripture this repo actually ships.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  MATCH_THRESHOLD,
  MATCH_TOKENS,
  MIN_VERIFIED_RATE,
  createAlignmentReport,
  createLemmaVerifier,
  loadScripture,
  words,
} from "../../../scripts/lib/lemma-verify.mjs";

function verseText(bookSlug: string, chapter: number, verse: number): string {
  const file = path.join(process.cwd(), "data", "bible", bookSlug, `${chapter}.json`);
  const doc = JSON.parse(fs.readFileSync(file, "utf8")) as {
    verses: { n: number; text: string }[];
  };
  const found = doc.verses.find((v) => v.n === verse);
  if (!found) throw new Error(`${bookSlug} ${chapter}:${verse} is not in the shipped text`);
  return found.text;
}

describe("calibration constants", () => {
  // Changing any of these changes which notes land on which verse across the
  // whole corpus. If a change is deliberate, re-run the Mark oracle and update
  // the number here in the same commit; if the oracle moves, the change is wrong.
  it("are the values Mark was calibrated against", () => {
    expect(MATCH_TOKENS).toBe(8);
    expect(MATCH_THRESHOLD).toBe(0.5);
    expect(MIN_VERIFIED_RATE).toBe(0.9);
  });
});

describe("words", () => {
  it("strips the transcription's bracketed references", () => {
    expect(words("Behold, I send my messenger [Mal 3:1] before thy face")).toBe(
      "behold i send my messenger before thy face",
    );
  });

  it("folds case, entities and punctuation away", () => {
    expect(words('"And&nbsp;he saith unto them, Follow me!"')).toBe("and he saith unto them follow me");
  });

  it("survives an empty or punctuation-only string", () => {
    expect(words("")).toBe("");
    expect(words("--- .,;")).toBe("");
  });
});

describe("loadScripture", () => {
  it("keys the shipped text by chapter and verse", () => {
    const mark = loadScripture("mark");
    expect(mark.size).toBe(16);
    expect(mark.get(1)?.size).toBe(45);
    expect(mark.get(16)?.size).toBe(20);
    expect(mark.get(1)?.get(1)).toContain("gospel");
  });

  it("refuses a book we do not carry, rather than verifying against nothing", () => {
    expect(() => loadScripture("no-such-book")).toThrow(/no shipped Scripture/);
  });
});

describe("verifyAnchor", () => {
  const mark = createLemmaVerifier("mark");

  it("accepts a lemma that really is the verse it claims", () => {
    const check = mark.verifyAnchor(verseText("mark", 4, 3), 3, 4);
    expect(check.ok).toBe(true);
    expect(check.chapter).toBe(4);
    expect(check.score).toBe(1);
  });

  it("accepts a lemma the 1842 edition trimmed and repunctuated", () => {
    // What the printed volumes actually do to a verse: title case, a bracketed
    // cross-reference dropped in, and the quotation cut short.
    const opening = verseText("mark", 4, 3).split(" ").slice(0, 6).join(" ");
    const asPrinted = `"${opening.toUpperCase()} [Isa. lv. 10]`;
    expect(mark.verifyAnchor(asPrinted, 3, 4).ok).toBe(true);
  });

  it("rejects ordinary numbered prose, which is the whole point", () => {
    const prose = "There is no introduction of the word substance, that is, no assertion";
    expect(mark.verifyAnchor(prose, 3, 4).ok).toBe(false);
  });

  it("rejects an anchor past the end of its chapter", () => {
    // Matthew 3 has seventeen verses. The first version of the ingest wrote a
    // note at Matthew 3:19 because it matched on shape; nothing can match here.
    const matthew = createLemmaVerifier("matthew");
    const check = matthew.verifyAnchor("And Joseph her husband, being a just man", 19, 3);
    expect(check.ok).toBe(false);
    expect(check.score).toBe(0);
  });

  it("proves a missing chapter boundary instead of inferring one", () => {
    // Asked about chapter 1 while holding text that opens chapter 2: the
    // verifier reports where it actually matched, so a heading the source
    // omitted is recovered by evidence.
    const check = mark.verifyAnchor(verseText("mark", 2, 1), 1, 1);
    expect(check.ok).toBe(true);
    expect(check.chapter).toBe(2);
  });

  it("does not wander further than the next chapter", () => {
    // Bounded on purpose. A matcher free to search the whole book would find a
    // plausible home for almost any sentence.
    expect(mark.verifyAnchor(verseText("mark", 5, 1), 1, 1).ok).toBe(false);
  });
});

describe("alignment report", () => {
  const report = () => createAlignmentReport({ label: "test", command: "none", source: "none" });

  it("counts an empty run as clean rather than dividing by zero", () => {
    const r = report();
    expect(r.rate()).toBe(0);
    expect(r.counts).toEqual({ verified: 0, rejected: 0, flagged: 0, unnamed: 0 });
  });

  it("holds the floor at the calibrated rate", () => {
    const r = report();
    for (let i = 0; i < 9; i++) r.pass();
    r.fail({ chapter: 1, n: 1, hit: "0.00", quoted: "x" });
    expect(r.rate()).toBeCloseTo(0.9);
    expect(r.belowFloor()).toBe(false);

    r.fail({ chapter: 1, n: 2, hit: "0.00", quoted: "y" });
    expect(r.belowFloor()).toBe(true);
  });

  it("keeps flags out of the rate, since they need an editor and not a gate", () => {
    const r = report();
    r.pass();
    r.flag({ where: "Romans 14:25", detail: "no verse matched", homily: 27, quoted: "Now to Him" });
    expect(r.rate()).toBe(1);
    expect(r.belowFloor()).toBe(false);
    expect(r.counts.flagged).toBe(1);
  });

  it("tallies unmapped speaker labels commonest first", () => {
    const r = report();
    r.unnamedLabel("Raban");
    r.unnamedLabel("Haymo");
    r.unnamedLabel("Raban");
    expect(r.unnamedEntries()).toEqual([
      ["Raban", 2],
      ["Haymo", 1],
    ]);
  });
});
