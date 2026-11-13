import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * A Greek word's card in Arabic (1.9, the gate's final check of 2026-11-13,
 * fail 4): with the interlinear on, every word of John 1 opens a "Word
 * details" card whose Close stayed where English puts it when the page
 * turned to Arabic, 8.6px off its mirrored place on a phone (checkMock's
 * mirror rule). The phone's sheet pulled its Close into the edge with a
 * physical right margin (-mr-2), and the card a tablet shows beside the word
 * placed its Close from the right (right-2) and kept the word's room on the
 * right (pr-7), so in Arabic it would have stood over the word.
 *
 * What it holds: nothing in the card is placed by a physical side, only by
 * the start or the end; the Close is pulled into the end on a phone and
 * placed from the end on a tablet; the word keeps its room from the Close
 * on the end side, in a line that follows the page's direction, while the
 * Greek itself still reads left to right.
 *
 * What a reader would notice if this broke: in Arabic, the card's Close on
 * the side the words begin from, or over the Greek word.
 */

const FILE = "components/bible/WordPopover.tsx";
/** The code without its comments, so a note is not read as the card. */
const code = fs
  .readFileSync(path.join(process.cwd(), FILE), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
  .replace(/^\s*\/\/.*$/gm, "");

/** Every class the card names, from its className strings. */
const classes = [...code.matchAll(/className="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean);

describe("a Greek word's card in Arabic", () => {
  it("places nothing by a physical side, only by the start or the end", () => {
    expect(classes.length).toBeGreaterThan(40);
    // A margin, padding, inset, rounding, border or alignment set left or right
    // (with any variant before it, and negative or not) stays put in Arabic.
    const physical = classes.filter((c) =>
      /^(?:[\w-]+:)*-?(?:m[lr]|p[lr]|left|right|rounded-[lr]|rounded-[tb][lr]|border-[lr]|text-left|text-right|scroll-m[lr]|scroll-p[lr])(?:-|$)/.test(c),
    );
    expect(physical, physical.join(" ")).toEqual([]);
  });

  it("pulls the phone sheet's Close into the end, and places the tablet card's Close from the end", () => {
    // The sheet's Close, as fail 4 measured it.
    expect(code).toContain('className="-me-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full');
    // The card beside the word on a wider screen.
    expect(code).toContain('className="hit-44 absolute top-2 end-2 h-7 w-7 rounded-full');
  });

  it("keeps the word's room from the Close on the end side, the Greek still reading left to right", () => {
    // The room is on a line that follows the page, so in Arabic it is on the left, where the Close is.
    expect(code).toMatch(/<p className="text-title-sm text-paper font-semibold leading-tight pe-7">\s*<span lang="grc" dir="ltr" style=\{GREEK\}>\s*\{token\.w\}\s*<\/span>\s*<\/p>/);
  });
});
