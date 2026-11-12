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

describe("b. the commentary sheet in Arabic", () => {
  it("pulls Continue reading and the verse's count to the start and end, never left or right", () => {
    const sheet = read("components/bible/MobileCommentarySheet.tsx");
    expect(sheet).toContain('className="-ms-1 mt-1 inline-flex min-h-11 items-center gap-1.5');
    expect(sheet).toContain('<span className="ms-2 rounded-full bg-paper/10');
    expect(sheet).not.toMatch(/className="[^"]*(?:^|\s)-?m[lr]-[\d[]/m);
  });
});

describe("c. the wide calendar", () => {
  const page = read("components/calendar/CalendarClient.tsx");
  const panel = read("components/calendar/FeastPanel.tsx");
  const cap = read("components/calendar/DropCap.tsx");

  it("inks the dots between its links as the links are inked", () => {
    expect(page).not.toContain("text-gold/35");
    expect(page.match(/<span aria-hidden className="text-paper\/55 text-caption">\s*·\s*<\/span>/g)).toHaveLength(3);
  });

  it("gives New, Old, Prev, Today and Next 44px to the touch, and the day's readings 44px rows", () => {
    expect(page.match(/className=\{`hit-44 font-sans text-caption tracking-\[0\.5px\] transition-colors/g)).toHaveLength(2);
    expect(page.match(/className="hit-44 (?:inline-flex items-center gap-1 )?font-sans text-caption tracking-\[0\.5px\] text-paper\/(?:65|85)/g)).toHaveLength(3);
    expect(page).toContain('className="group flex min-h-[44px] items-baseline justify-between gap-3 py-2.5"');
  });

  it("sets its words at the start and the end, so they mirror in Arabic", () => {
    for (const src of [page, panel, cap]) {
      expect(src).not.toMatch(/(?:^|[\s"'`:])(?:text-left|text-right|clear-left|clear-right)(?=[\s"'`])/m);
      expect(src).not.toMatch(/(?:^|[\s"'`:])-?m[lr]-[\d[]/m);
    }
    expect(panel).toContain('"min-w-0 text-center md:text-start"');
    expect(cap).toContain('className="text-gold me-[2px]"');
  });

  it("inks the fast's names on Light and the light looks at 4.5:1 at the least, on the page, the legend and a fast's own badge", () => {
    const block = (sel: string) => CSS.slice(CSS.indexOf(`${sel} {`), CSS.indexOf("}", CSS.indexOf(`${sel} {`)));
    const hex = (b: string, name: string) => {
      const v = b.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, "i"))?.[1] ?? "";
      return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
    };
    const triple = (b: string, name: string) => (b.match(new RegExp(`--${name}: (\\d+) (\\d+) (\\d+);`))?.slice(1) ?? []).map(Number);
    const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
    const lum = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const ratio = (a: number[], b: number[]) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    const over = (fg: number[], alpha: number, bg: number[]) => fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));

    const light = block('html[data-reading-mode="parchment"]');
    const grounds = [light, ...["desert", "jordan", "blush", "rose", "lavender", "olive", "stone"].map((l) => block(`html[data-look="${l}"]`))].map((b) => ({
      night: hex(b, "color-night"),
      paper: hex(b, "color-paper"),
    }));
    for (const g of grounds) expect(g.night).toHaveLength(3);
    for (const tone of ["fast-strict", "fast-wine-oil", "fast-fish", "fast-fast", "fast-free", "fast-normal"]) {
      const fg = triple(light, tone);
      expect(fg, tone).toHaveLength(3);
      for (const { night, paper } of grounds) {
        for (const ground of [night, over(paper, 0.03, night), over(fg, 0.08, night)]) {
          expect(ratio(fg, ground), `${tone} on ${ground}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});
