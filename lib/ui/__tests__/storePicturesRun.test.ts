import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * What the store pictures' run found on the app's own screens (2026-11-12;
 * docs/plans/v1.9/store/README.md, "For the arbiter"; the arbiter's word of
 * 16:01 UTC), the first time the gate's checks met a tablet's widths:
 *
 *  a. The interlinear's Greek words and a Father's glossed words are buttons
 *     inside a line of words, 24 to 32px tall. They stay the size of the words
 *     they are, and say so: a word in its own line is the 44px rule's own
 *     exception (a link in a sentence), named on each with its reason.
 *  b. The commentary sheet's Continue reading stood 4px off its mirror in
 *     Arabic (a margin pulled left, not to the start); the count beside the
 *     verse's name the same.
 *  c. The calendar from 800px wide (a 10-inch tablet, an iPad): the dots
 *     between New and Old, Prev, Today and Next at 2.2 to 2.8:1 (the links'
 *     own ink now); New, Old, Prev, Today and Next 19 to 23px tall (44 to the
 *     touch now); the day's readings 42.9px (44); the feast panel and the
 *     readings set left or right, not start or end; and the fast's names on
 *     Light at 3.80 to 4.18:1, their tones now a shade deeper there.
 *  d. The journal's prompt under "Nothing written yet", one line on a tablet
 *     and 28.5px tall: 44 to the touch.
 *  e. Prayers' banner on a tablet cut the Pantocrator from the brow up: the
 *     picture spans the column there and stood 17.375rem tall, his face under
 *     the fade. Taller there by 9rem, the verse lower by as much, and cut about
 *     his face, so his face stands in the frame at every width.
 *
 * What it cannot see: the screens. The export check holds each at 390, 800
 * and 1032 wide, for both readers, on the five palettes and the seventeen
 * looks and in Arabic, with checkMock { pixels: true }.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const CSS = read("app/globals.css");

describe("a. words in their own line", () => {
  it("the interlinear's Greek words name the 44px rule's exception, with its reason", () => {
    const row = read("components/bible/VerseRow.tsx");
    const at = row.indexOf("onClick={(e) => openPopover(i, e.currentTarget)}");
    expect(at).toBeGreaterThan(0);
    const button = row.slice(row.lastIndexOf("<button", at), at);
    expect(button).toContain('data-mock-allow="target"');
    expect(button).toContain('data-mock-why="a word in the verse\'s own line"');
  });

  it("a Father's glossed words do the same", () => {
    const glossed = read("components/bible/GlossedText.tsx");
    expect(glossed).toContain('data-mock-allow="target"');
    expect(glossed).toContain('data-mock-why="a word in its own line of the text"');
  });
});
