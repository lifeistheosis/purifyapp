// The segmented switch never cuts a word (1.9, the arbiter's of 2026-11-10
// 11:45 UTC: "the house's segmented switch gives its parts equal widths and
// cuts a word that does not fit ... where a word is cut, fix it the house's
// way"). Measured on the export with its own fonts, in all twenty-one
// languages at 390 and 360 pixels: in equal parts, Greek's "Your ledger" was
// cut on a walkthrough's book, and 22 words in fourteen languages on a history
// event's row of parts, which wears the switch's look.
//
// What this holds, in the code of the switch and of the row that copies it:
//
//  - The parts are equal while every word fits, and a part whose word needs
//    more takes it: each column is at least its words' width
//    (minmax(max-content, 1fr)), never an equal fraction that may be narrower.
//  - Nothing cuts: no truncate, no ellipsis, and the words stay on one line.
//  - If a row ever cannot hold its words, it scrolls inside its own rim
//    (overflow-x-auto, its scrollbar hidden), so nothing spills onto the page.
//  - No part is narrower than a finger (min-w-11, 44 pixels).
//
// What it does not hold: the widths themselves, which only the export can
// measure (the walk of build 90's switch, docs/1.9-build/notes).

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..", "..");
/** The file's code, its comments left out. */
const code = (file: string) =>
  fs
    .readFileSync(path.join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const ROWS = ["components/ui/SegmentedSwitch.tsx", "components/history/EventPartsNav.tsx"];

describe("the segmented switch and the row that wears its look", () => {
  for (const file of ROWS) {
    it(`never cuts a word: ${file}`, () => {
      const c = code(file);
      expect(c).toContain("auto-cols-[minmax(max-content,1fr)]");
      expect(c).not.toMatch(/\bauto-cols-fr\b/);
      expect(c).not.toMatch(/\btruncate\b/);
      expect(c).not.toMatch(/text-ellipsis|line-clamp-1/);
      expect(c).toContain("whitespace-nowrap");
      expect(c).toMatch(/no-scrollbar[^"]*overflow-x-auto|overflow-x-auto[^"]*no-scrollbar/);
      expect(c).toContain("min-w-11");
    });
  }
});
