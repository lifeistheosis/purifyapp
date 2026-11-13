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
/** On the light looks alone: worn over Light, with their tinted paper (scripts/mock-check.mjs, LOOKS). */
const LOOKS_AT = (n: number) => `[html[data-reading-mode=parchment][data-look]_&]:text-paper/${n}`;

describe("words over pictures, mended", () => {
  it("Prayers' chants door: its kicker inked at 80% on Candlelight, the line under its name at 80% on paper, both at 70% elsewhere", () => {
    // The card's sheen lies under its words: "Sung prayer" read 4.10:1 on Candlelight and
    // "Hymns to listen to..." 4.40:1 on Light (the gate's faint lines, the arbiter's word of 18:40 UTC).
    // In Arabic the words start beside the disc, under the sheen's bright corner: at 60 the kicker read 4.40:1 on
    // Monastery at 390 and 4.36 at 800 and 1032, 4.26 to 4.32 on Councils and Cappadocian; at 65 the line read 4.35 on
    // Candlelight (2026-11-13). At 70 every palette and look passed, the two earned by reading with them.
    const src = read("components/mobile/SoftTiles.tsx");
    expect(src).toContain('className="font-sans text-caption font-semibold text-paper/70 [html[data-reading-mode=candlelight]_&]:text-paper/80"');
    expect(src).toContain(`className="mt-1.5 font-sans text-caption text-paper/70 leading-[1.5] ${PAPER_80}"`);
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

  it("Today's hour card: the line under the hour's name is inked at 80% on paper, 90% on the light looks", () => {
    // The morning line ("Begin the day with God...") runs furthest under the card's picture:
    // 4.28 to 4.50:1 on seven light looks at 80% (the gate's final run of 2026-11-12).
    const src = read("components/today/PrayNowCard.tsx");
    expect(src).toContain(`className="mt-1.5 max-w-[12.5rem] font-sans text-detail leading-snug text-paper/60 ${PAPER_80} ${LOOKS_AT(90)}">{t(hour.lineKey)}</p>`);
  });

  it("An event's Thread map: its home city in the corner at 80% on every palette", () => {
    // "Kodiak" on /history/alaska-mission/ read 4.44 to 4.50:1 at 70% on five light looks (the final run of 2026-11-12),
    // and "Antioch" on /history/missions-of-apostle-paul/ 3.89 on Light, 4.40 on Candlelight and 4.26 on Mosaic (the
    // confirm run). At 80 the corner's name passed on all 34 events that show it, on the five palettes and the seventeen looks.
    const src = read("components/history/EventThread.tsx");
    expect(src).toContain('className="thread-map-name absolute start-3 top-2.5 font-sans text-caption font-medium text-paper/80">');
  });

  it("A picture tile on Candlelight: its shade at 85% at the foot, so the Hours tile's name holds over the Compline icon", () => {
    // "The Hours" read 2.99:1 at 82% after nine at night (the final run of 2026-11-12); large words need 3:1.
    const css = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toContain(
      'html[data-reading-mode="candlelight"] .tile-shade {\n background: linear-gradient(180deg, transparent 26%, color-mix(in srgb, var(--color-night) 85%, transparent) 100%);\n}',
    );
  });

  it("A council's head over its icon: the kicker in the halo at the full ink, the line under the name at 80% on the light looks", () => {
    // On the seven Ecumenical Councils' pages "First Ecumenical Council" to "Seventh" read 2.46 to 3.57:1 at 80% over
    // the icon's foot, on three to five palettes each, and "325 · Nicaea in Bithynia" 4.43 to 4.49 at 70% on two light
    // looks (the gate's confirm run of 2026-11-12). A council with no picture (Ancyra) keeps its ink.
    const page = read("app/(app)/councils/[slug]/page.tsx");
    expect(page).toContain('<p id="council-ordinal" className={cn("font-sans text-caption font-semibold", picture ? "words-halo text-paper" : "text-paper/80")}>');
    expect(page).toContain('className={cn("mt-1.5 font-sans text-detail text-paper/70", picture && "[html[data-reading-mode=parchment][data-look]_&]:text-paper/80")}');
  });

  it("A council's shelf: the minutes under each book at 75% on Light, where the backdrop's foot lies under the first row", () => {
    // At Light's own 70 (its lift of every share under 68) they read 4.17 to 4.49:1 on all seven shelves (the gate's
    // confirm run of 2026-11-12); at 75 every shelf passed on the five palettes and the seventeen looks. The light
    // looks lift the share to 76 to 80 on their own, so the rule is Light's alone.
    const shelf = read("components/councils/CouncilShelf.tsx");
    expect(shelf).toContain('<span className="mt-2 block text-center font-sans text-caption text-paper/55 [html[data-reading-mode=parchment]:not([data-look])_&]:text-paper/75">');
    const css = read("app/globals.css");
    const lift = (look: string) => Number(css.match(new RegExp(`:where\\(html\\[data-look="${look}"\\]\\) :is\\([^)]*\\.text-paper\\\\/55[^)]*\\) \\{\\n\\s*color: color-mix\\(in oklab, var\\(--color-paper\\) (\\d+)%`))?.[1]);
    for (const look of ["jordan", "blush", "rose", "lavender", "olive", "stone"]) expect(lift(look)).toBeGreaterThanOrEqual(75);
  });

  it("The Plus dock's small print at 65%, clear of the Join button's glow on every palette", () => {
    // "Renews automatically until you cancel..." stands under the button's soft white glow: at 45 (each palette's faint
    // floor) it read 4.23 to 4.37:1 by the pixels on Dark, True black, Candlelight and Monastery (build 95, the Discover
    // walk; the arbiter's word of 2026-11-13). At 62 Candlelight still read 4.37; at 65 every palette and look passed.
    const src = read("components/billing/KeptPaywall.tsx");
    expect(src).toContain('<p className="mt-2 text-center font-sans text-[11.5px] leading-[1.45] text-paper/65">');
  });

  it("The Plus hero's line at 80% on paper, where a title of one line lifts it onto the scribe's foot (Arabic)", () => {
    // "Plus pays for the servers and the work..." in Arabic read 3.77 to 4.04:1 on Light and the light looks at 390, 800
    // and 1032; English, under a title of two lines, stands on the page and passed. At 75 it still read 4.20.
    const src = read("components/billing/KeptPaywall.tsx");
    expect(src).toContain(`className="paywall-in mt-2 max-w-[420px] font-sans text-[13.5px] leading-[1.45] text-paper/70 ${PAPER_80}"`);
  });

  it("The picture sheet's tabs: a tab not chosen at 80% on paper, where the preview's shadow falls across the row", () => {
    // "Words" read 4.11:1 and "Size" 4.32 by the pixels on Light and the light looks (named by Updates 4 on 2026-11-13;
    // checkMock reads the row's ground from its colours and passed it). At 80: 5.26 and 5.58.
    const src = read("components/share/PictureSheet.tsx");
    expect(src).toContain(`tab === item.id ? ON : "text-paper/60 ${PAPER_80}"`);
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
