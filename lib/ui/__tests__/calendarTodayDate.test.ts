import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { READING_THEMES, themeAttributes } from "@/lib/reader/readingModes";

/**
 * Today's date on the computer's calendar (the final check, 2026-11-13; the
 * arbiter's word of 23:46 UTC). On a day with no feast it was set in the day's
 * own tone, and the tone sits near the page wherever it is dark on a dark page
 * or light on a light one: an ordinary day's muted tone read 3.58:1 on Light
 * (3.19 to 3.88 on the light looks), a fast-free day's green 3.80 to 4.43 on
 * six light looks, and a fast day's crimson 3.30 to 3.60 on every dark
 * palette, at 800 and 1032 wide. It is set now in the page's own ink, as the
 * phone's calendar sets it (PhoneCalendar.tsx); the ring and the glow carry
 * the day's tone, and a feast keeps its rubric.
 *
 * What it cannot see: the screen. The export check holds /calendar/ at 390,
 * 800 and 1032 with checkMock { pixels: true } on the five palettes and the
 * seventeen looks and in Arabic, with today on a day of each tone.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const CELL = read("components/calendar/CalendarCell.tsx");

type Rgb = [number, number, number];
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const BLOCKS = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2] }));
/** A token as the cascade gives it: the most specific block that sets it, its last word in the stylesheet. */
function token(selectors: string[], name: string): string | undefined {
  for (const selector of selectors) {
    let value: string | undefined;
    for (const b of BLOCKS) {
      if (b.selector !== selector) continue;
      const m = new RegExp(`--${name}\\s*:\\s*([^;]+);`).exec(b.body);
      if (m) value = m[1].trim();
    }
    if (value) return value;
  }
  return undefined;
}
const rgbOf = (v: string | undefined): Rgb | undefined => {
  if (!v) return undefined;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v)?.[1];
  if (hex) {
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as Rgb;
  }
  const triple = /^(\d+) (\d+) (\d+)$/.exec(v);
  return triple ? (triple.slice(1).map(Number) as Rgb) : undefined;
};
const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: Rgb, b: Rgb) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const over = (fg: Rgb, alpha: number, bg: Rgb) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as Rgb;

/** The five palettes and the fifteen looks, each as the app wears it. */
const PALETTES: [string, string | null, string | null][] = [
  ["Dark", null, null],
  ["Light", "parchment", null],
  ["Black", "black", null],
  ["Candlelight", "candlelight", null],
  ["Monastery", "monastery", null],
  ...READING_THEMES.filter((theme) => theme.look).map((theme): [string, string | null, string | null] => {
    const { mode, look } = themeAttributes(theme.id);
    return [theme.label, mode, look];
  }),
];
const TONES = ["tone-gold", "tone-crimson", "tone-green", "tone-muted"];

describe("today's date on the calendar's month", () => {
  it("is set in the page's own ink on a day with no feast, and takes no colour from the day's tone", () => {
    expect(CELL).toContain('cell.hasFeast ? "rubric" : cell.isToday ? "text-paper" : "text-paper/85"');
    expect(CELL).not.toMatch(/color:\s*`rgb\(\$\{rgb\}\)`/);
    // The ring and the glow keep the day's tone.
    expect(CELL).toContain("lampada-glow outline outline-2 outline-offset-[-2px] outline-[rgb(var(--tone)/0.7)]");
  });

  it("reads 4.5:1 or more on every palette and look, on each ground and under the glow of each tone", () => {
    expect(PALETTES).toHaveLength(20);
    for (const [name, mode, look] of PALETTES) {
      const selectors = [look && `html[data-look="${look}"]`, mode && `html[data-reading-mode="${mode}"]`, ":root", "@theme"].filter(Boolean) as string[];
      const ink = rgbOf(token(selectors, "color-paper"));
      expect(ink, `${name}'s ink`).toBeDefined();
      const grounds = ["color-night", "color-night-soft", "color-night-deep"].map((g) => rgbOf(token(selectors, g)));
      expect(grounds[0], `${name}'s page`).toBeDefined();
      for (const tone of TONES) {
        const fg = rgbOf(token(selectors, tone));
        expect(fg, `${name}'s ${tone}`).toBeDefined();
        for (const ground of grounds) {
          if (!ground) continue;
          // The glow is the tone at 22% at its heart (.lampada-glow::before).
          for (const glow of [0, 0.22]) {
            expect(ratio(ink!, over(fg!, glow, ground)), `${name}, ${tone} at ${glow}`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });
});
