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
 *     readings set left or right, not start or end. Held on the seventeen
 *     looks as well, which the store run did not measure, the light looks'
 *     darker grounds took more below 4.5:1: a fast's name in its tone (drawn
 *     now toward the page's own ink there, a share for each light palette),
 *     the fast badge's rule lines, the day's weekday and the month's feast
 *     names; and the drop capital's letter for a screen reader stood off its
 *     mirror.
 *  d. The journal's prompt under "Nothing written yet", one line on a tablet
 *     and 28.5px tall: 44 to the touch.
 *  f. The saints' century timeline, where it fits a wide screen (from 1024):
 *     its 21 marks stood 41.8px across at an iPad's 1032 (Admin's walk at
 *     tablet widths, the arbiter's word of 17:00 UTC). Each keeps 44px there,
 *     and the 4px between them goes.
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

  it("draws a fast's name toward the page's ink on Light and the light looks, 4.5:1 on every ground it stands on there", () => {
    // The badge and the legend name the fast in its words; the icon keeps the pure tone.
    const badge = read("components/calendar/FastBadge.tsx");
    const grid = read("components/calendar/CalendarGrid.tsx");
    expect(badge).toContain('className="fast-words font-sans text-ui font-semibold leading-tight"');
    expect(badge).toContain('style={{ "--fast-tone": meta.rgb } as React.CSSProperties}');
    expect(grid).toContain('className="fast-words inline-flex items-center gap-1.5"');
    expect(grid).toContain("<Icon size={14} style={{ color: `rgb(${FAST_META[kind].rgb})` }} />");

    const block = (sel: string) => CSS.slice(CSS.indexOf(`${sel} {`), CSS.indexOf("}", CSS.indexOf(`${sel} {`)));
    const hex = (b: string, name: string) => {
      const v = b.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, "i"))?.[1] ?? "";
      return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
    };
    const triple = (b: string, name: string) => (b.match(new RegExp(`--${name}: (\\d+) (\\d+) (\\d+);`))?.slice(1) ?? []).map(Number);
    // sRGB, linear light and OKLab, as color-mix(in oklab, ...) mixes.
    const toLin = (c: number) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
    const toSrgb = (c: number) => 255 * (Math.min(1, Math.max(0, c)) <= 0.0031308 ? 12.92 * Math.max(0, c) : 1.055 * Math.min(1, c) ** (1 / 2.4) - 0.055);
    const oklab = (rgb: number[]) => {
      const [r, g, b] = rgb.map(toLin);
      const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
      const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
      const sx = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
      return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * sx, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * sx, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * sx];
    };
    const fromOklab = ([L, a, b]: number[]) => {
      const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
      const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
      const sx = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
      return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * sx, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * sx, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * sx].map(toSrgb);
    };
    const mixOk = (a: number[], b: number[], share: number) => fromOklab(oklab(a).map((v, i) => v * share + oklab(b)[i] * (1 - share)));
    const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
    const lum = ([r, g, b]: number[]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const ratio = (a: number[], b: number[]) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    const over = (fg: number[], alpha: number, bg: number[]) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));

    const light = block('html[data-reading-mode="parchment"]');
    const shareOf = (look: string | null) =>
      Number((look ? CSS.match(new RegExp(`html\\[data-reading-mode="parchment"\\]\\[data-look="${look}"\\] \\{ --fast-words-share: (\\d+)%; \\}`))?.[1] : CSS.match(/var\(--fast-words-share, (\d+)%\)/)?.[1]) ?? NaN) / 100;
    const palettes = [null, "desert", "jordan", "blush", "rose", "lavender", "olive", "stone", "linen"].map((look) => {
      const b = look ? block(`html[data-look="${look}"]`) : light;
      return { look, share: shareOf(look), night: hex(b, "color-night"), soft: hex(b, "color-night-soft"), deep: hex(b, "color-night-deep"), paper: hex(b, "color-paper") };
    });
    for (const tone of ["fast-strict", "fast-wine-oil", "fast-fish", "fast-fast", "fast-free", "fast-normal"]) {
      const fg = triple(light, tone);
      expect(fg, tone).toHaveLength(3);
      for (const p of palettes) {
        expect(p.share, `${p.look}'s share`).toBeGreaterThan(0);
        const words = mixOk(fg, p.paper, p.share);
        for (const ground of [p.night, p.soft, p.deep]) {
          const card = over(p.paper, 0.03, ground);
          for (const under of [ground, card, over(fg, 0.08, card)]) {
            expect(ratio(words, under), `${tone} on ${p.look ?? "Light"}`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });

  it("deepens on the light looks what their darker grounds took below 4.5:1: the badge's rule, the day's weekday, the month's feast names", () => {
    const badge = read("components/calendar/FastBadge.tsx");
    expect(badge.match(/text-paper\/70 leading-\[1\.5\] \[html\[data-reading-mode=parchment\]\[data-look\]_&\]:text-paper\/80/g)).toHaveLength(2);
    expect(read("components/calendar/DayScroll.tsx")).toContain('className="font-sans text-caption font-semibold text-gold/70 [html[data-reading-mode=parchment][data-look]_&]:text-gold"');
    expect(read("components/calendar/CalendarCell.tsx")).toContain('cell.hasFeast ? "rubric opacity-90 [html[data-reading-mode=parchment][data-look]_&]:opacity-100" : "text-paper/60"');
    // The drop capital's letter for a screen reader, placed from the start so it mirrors.
    expect(read("components/calendar/DropCap.tsx")).toContain('className="sr-only start-0"');
  });
});

describe("d. the wide journal", () => {
  it("gives the prompt under Nothing written yet 44px to the touch", () => {
    expect(read("components/journal/JournalClient.tsx")).toContain('className="tap-press hit-44 mt-2 block text-start font-serif text-lede leading-[1.5] text-paper"');
  });
});

describe("e. Prayers' banner on a tablet", () => {
  it("is taller across the column, the verse lower by as much, and the icon cut about his face", () => {
    expect(read("components/mobile/PrayersHero.tsx")).toContain('className="prayers-hero-img h-full w-full object-cover object-[50%_20%] md:object-[50%_52%]"');
    const css = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toMatch(/@media \(min-width: 768px\) \{\s*\.prayers-hero-picture \{\s*height: 26\.375rem;\s*\}\s*\.prayers-hero-verse \{\s*padding-top: 15\.5rem;\s*\}\s*\}/);
  });
});

describe("f. the saints' century timeline where it fits", () => {
  it("keeps each of its marks 44px across from 1024 wide, the gap between them gone", () => {
    const timeline = read("components/saints/CenturyTimeline.tsx");
    expect(timeline).toContain('className="flex w-max min-w-full items-stretch gap-1 lg:w-auto lg:min-w-0 lg:gap-0"');
    const mark = /"group flex ([^"]*)",\s*"focus-visible/.exec(timeline)?.[1] ?? "";
    expect(mark.split(/\s+/)).toContain("lg:min-w-[44px]");
    expect(mark.split(/\s+/)).not.toContain("lg:min-w-0");
    // 21 marks of 44px fit the row where it no longer scrolls: about 963px at 1032, 955 at 1024.
    expect(21 * 44).toBeLessThan(955);
  });
});
