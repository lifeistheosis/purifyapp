// The dictionary's words are listed whole, once (Gate 6c, 2026-11-17).
//
// The motion walk at CPU 4x with motion reduced, as a new reader
// (docs/handoffs/gate-6-walks/motion-6c.tsv): the dictionary's "Find a word"
// opened the search on the dictionary's words, and 295ms after the tap the row
// "Archimandrite" dropped 84px in one frame. The words were listed as soon as
// the library's lists had come, and each word's definition (fetched on its own,
// loadDefinitions) came after and grew the rows over it by a line. A part that
// lands late and shoves what is on the screen fails the gate whatever the
// motion. Now the list waits for its definitions, as the strip waits for its
// kinds (stripComing), and comes once, whole; if they cannot be read the words
// are listed without them, as before.
//
// Read as text: the search is a client component and vitest runs in node
// (vitest.config.ts). The frames are measured on the built app by
// scripts/motion-walk.mjs.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const palette = fs
  .readFileSync(path.join(process.cwd(), "components/search/CommandPalette.tsx"), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\{\s*\/\*(?:(?!\*\/)[\s\S])*\*\/\s*\}/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

describe("the dictionary's words in the search", () => {
  it("are listed once their definitions have come, never before", () => {
    expect(palette).toMatch(/const wantsDefinitions = turn\.door === "theology" && turn\.kind === "dictionary";/);
    expect(palette).toMatch(/const definitionsComing = wantsDefinitions && !definitions;\s*const whole = turn\.kind && !definitionsComing \? behind\(rows, turn\.door, turn\.kind\) : \[\];/);
  });

  it("are listed without them when they cannot be read, so the list never waits for good", () => {
    expect(palette).toMatch(/void loadDefinitions\(\)\.then\(\(d\) => alive && setDefinitions\(d \?\? \[\]\)\);/);
    expect(palette).toMatch(/function loadDefinitions\(\): Promise<Definition\[\] \| null> \{[\s\S]{0,400}\.catch\(\(\) => null\);/);
  });
});
