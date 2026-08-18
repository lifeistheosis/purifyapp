// The truncation and reading-time logic behind the commentary rail.
//
// Proved here rather than in a browser on purpose. The rail is server-rendered
// inside the Bible reader, and only a handful of nodes on that page carry a
// client fiber, so a test browser cannot drive it. Verified against production
// as well as locally: 4 of 174 buttons on /bible/john/21 are React-attached in
// both. So the behaviour is asserted on the pure functions, which is also where
// it can be pinned permanently.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  PREVIEW_WORDS,
  WORDS_PER_MINUTE,
  paragraphsOf,
  previewParagraphs,
  readingMinutes,
  wordCount,
} from "@/lib/bible/readability";

const para = (words: number, seed = "word") =>
  Array.from({ length: words }, () => seed).join(" ");

describe("wordCount", () => {
  it("counts words, not characters", () => {
    expect(wordCount("one two three")).toBe(3);
  });

  it("is zero for empty and whitespace, never one", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("   \n  ")).toBe(0);
  });
});

describe("readingMinutes", () => {
  it("never returns zero, so a short note reads 1 min and not 0 min", () => {
    expect(readingMinutes("a few words")).toBe(1);
    expect(readingMinutes("")).toBe(1);
  });

  it("scales at the corpus reading speed", () => {
    expect(readingMinutes(para(WORDS_PER_MINUTE * 10))).toBe(10);
  });

  it("puts the worst note in the corpus at over eight hours", () => {
    // 90,758 words, Augustine on John 21:19. The number is the argument for
    // showing length before the tap rather than after it.
    expect(readingMinutes(para(90_758))).toBeGreaterThan(480);
  });
});

describe("previewParagraphs", () => {
  it("shows a short note whole and hides nothing", () => {
    const paras = [para(50), para(60)];
    const { shown, hidden } = previewParagraphs(paras);
    expect(shown).toHaveLength(2);
    expect(hidden).toBe(0);
  });

  it("stops once the budget is spent and reports what is left", () => {
    const paras = [para(150), para(150), para(150), para(150)];
    const { shown, hidden } = previewParagraphs(paras);
    expect(shown).toHaveLength(2); // 150 then 300, which passes the budget
    expect(hidden).toBe(2);
  });

  it("always keeps the first paragraph whole, however long it runs", () => {
    // Never cut mid-sentence: a Father stopped mid-clause reads as a defect.
    const paras = [para(5_000), para(10)];
    const { shown, hidden } = previewParagraphs(paras);
    expect(shown).toHaveLength(1);
    expect(wordCount(shown[0])).toBe(5_000);
    expect(hidden).toBe(1);
  });

  it("never returns an empty preview", () => {
    for (const paras of [[para(1)], [para(PREVIEW_WORDS * 100)], [""]]) {
      expect(previewParagraphs(paras).shown.length).toBeGreaterThan(0);
    }
  });

  it("loses no paragraph: shown plus hidden is the whole note", () => {
    const paras = Array.from({ length: 40 }, (_, i) => para(30, `p${i}`));
    const { shown, hidden } = previewParagraphs(paras);
    expect(shown.length + hidden).toBe(paras.length);
  });
});

describe("against the real corpus", () => {
  // The whole point is the long tail, so assert on actual notes rather than
  // on fixtures that flatter the implementation.
  const ROOT = path.join(process.cwd(), "data/bible/commentary");

  function longestNote(): string {
    let longest = "";
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(".json")) {
          const byVerse = JSON.parse(fs.readFileSync(p, "utf8")) as Record<
            string,
            { text?: string }[]
          >;
          for (const verse of Object.keys(byVerse)) {
            for (const note of byVerse[verse] ?? []) {
              if ((note.text?.length ?? 0) > longest.length) longest = note.text ?? "";
            }
          }
        }
      }
    };
    if (fs.existsSync(ROOT)) walk(ROOT);
    return longest;
  }

  const worst = longestNote();

  // The floor used to be 50,000 words, and it passed because the longest note
  // in the corpus was not a note: Tractate 124 on John 21:19 carried 90,758
  // words, being itself plus the whole of the Homilies on the First Epistle of
  // John and both books of the Soliloquies, swallowed by a region with a broken
  // end marker. Six other notes carried the volumes' printed indexes the same
  // way. With that removed the longest genuine note is a Chrysostom homily of
  // about 11,000 words, which is still far longer than any preview should show
  // and is the right thing to test the rule against.
  //
  // The floor exists so the suite fails loudly if the corpus ever stops
  // containing a note long enough to be worth previewing, rather than passing
  // vacuously on a short one. It is not a ratchet and it should not be raised to
  // chase whatever contamination happens to be present.
  it("found the long note to test against", () => {
    expect(wordCount(worst)).toBeGreaterThan(8_000);
  });

  it("cuts the worst note in the corpus to a readable opening", () => {
    const { shown, hidden } = previewParagraphs(paragraphsOf(worst));
    const shownWords = shown.reduce((n, p) => n + wordCount(p), 0);
    expect(hidden).toBeGreaterThan(0);
    // Generous ceiling: the rule keeps whole paragraphs, so the preview may
    // overshoot the budget by one paragraph. It must not overshoot by a book.
    expect(shownWords).toBeLessThan(PREVIEW_WORDS * 6);
  });
});
