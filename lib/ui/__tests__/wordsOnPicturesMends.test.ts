import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Three places where words stood on a picture under 4.5:1 (the gate's words
 * over pictures: Fable Themes' sweep of 2026-11-11, 126 screens; the
 * arbiter's word of 17:54 UTC), each mended with the least change that
 * passed checkMock { pixels: true } on the five palettes and the seventeen
 * looks, tried in the page before it was written:
 *
 *  - Plans' tiles. The name and the day count stood on the picture's melting
 *    foot, and a long name rose into it ("The New Testament in a year",
 *    2.46:1 on Light; the counts 4.29 to 4.48 on Light and the light looks).
 *    The picture now fills the tile above its words and melts into the
 *    tile's ground just before them, so the words stand on the ground.
 *  - Today's hour card. The line under the hour's name ran under the
 *    picture at the card's side: 3.96:1 on Light, 4.20 to 4.47 on six light
 *    looks. On paper the line is inked at 80% (60% everywhere else, as it
 *    was: the dark palettes passed).
 *  - A chant's head. On paper the icon's dark foot under the name left it at
 *    2.78 to 2.99:1 (large words need 3:1), and its kind ("Hymn", "Byzantine
 *    chant") at 4.44. A soft halo of the page's own colour lies under the
 *    head's words on paper, and the kind line is inked at 80% there.
 *
 * What it cannot see: the pixels. checkMock measures them on the export.
 *
 * What a reader would notice if this broke: on Light, a plan's name, the
 * hour card's line or a chant's name hard to read over its picture.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const PAPER_80 = "[html[data-reading-mode=parchment]_&]:text-paper/80";

describe("words over pictures, mended", () => {
  it("Prayers' chants door: its kicker inked at 80% on Candlelight, the line under its name at 80% on paper", () => {
    // The card's sheen lies under its words: "Sung prayer" read 4.10:1 on Candlelight and
    // "Hymns to listen to..." 4.40:1 on Light (the gate's faint lines, the arbiter's word of 18:40 UTC).
    const src = read("components/mobile/SoftTiles.tsx");
    expect(src).toContain('className="font-sans text-caption font-semibold text-paper/60 [html[data-reading-mode=candlelight]_&]:text-paper/80"');
    expect(src).toContain(`className="mt-1.5 font-sans text-caption text-paper/65 leading-[1.5] ${PAPER_80}"`);
  });

  it("Plans: a tile's picture ends where its words begin, so they stand on the tile's ground", () => {
    const src = read("components/plans/PlansClient.tsx");
    // The picture is a box of its own above the words, taking the room they leave.
    expect(src).toMatch(
      /<span aria-hidden className="relative -mx-3 -mt-3 mb-1 block min-h-0 flex-1" data-plan-tile-picture="">\s*<CoverArt[\s\S]{0,200}?className="plan-tile-picture absolute inset-0 h-full w-full"\s*\/>\s*<\/span>\s*<span className="relative block font-sans text-ui font-semibold leading-tight text-paper">/,
    );
    // And it is the tile's only picture: nothing else is laid under the words.
    expect(src.match(/className="plan-tile-picture /g)).toHaveLength(1);
  });

  it("Today's hour card: the line under the hour's name is inked at 80% on paper", () => {
    const src = read("components/today/PrayNowCard.tsx");
    expect(src).toContain(`className="mt-1.5 max-w-[12.5rem] font-sans text-detail leading-snug text-paper/60 ${PAPER_80}">{t(hour.lineKey)}</p>`);
  });

  it("A chant's head: a halo of the page's own colour under its words on paper, and its kind inked at 80% there", () => {
    const page = read("components/chants/ChantPage.tsx");
    expect(page).toContain(`className="doctrine-shadow mt-1 truncate font-sans text-[13px] leading-[18px] text-paper/60 ${PAPER_80}"`);
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toContain(
      'html[data-reading-mode="parchment"] [data-chant-control="name"] .doctrine-shadow {\n text-shadow: 0 0 2px var(--color-night), 0 0 8px var(--color-night), 0 0 18px var(--color-night);\n}',
    );
    // The halo stands after paper's rule that takes the dark palettes' shadow away, and outweighs it.
    expect(css.indexOf('html[data-reading-mode="parchment"] [data-chant-control="name"] .doctrine-shadow {')).toBeGreaterThan(
      css.indexOf('html[data-reading-mode="parchment"] .doctrine-shadow {'),
    );
  });
});
