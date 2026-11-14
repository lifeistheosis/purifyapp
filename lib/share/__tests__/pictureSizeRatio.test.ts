// The verse picture's Size tab: the chosen shape's ratio is legible on every
// palette (1.9, Updates 58's checkMock with pixels, mended by Updates 60).
//
// The chosen chip is white, softly lit (ON in components/share/PictureSheet.tsx:
// bg-paper, the ink text-night) and its ratio, "9:16" beside Story, the shape
// every picture opens on, was drawn at text-night/55. On the export it read
// 3.73:1 at its least, under WCAG AA's 4.5:1, on 12 of the 21 palettes (Dark,
// Candlelight, Monastery, Councils, Cappadocian and the looks Night sky, Dawn,
// Incense, Holy Mountain, Forest, Mosaic and Damask), at every width, in
// English and Arabic. The mend is the same ink at the least share that holds
// all 21, chosen by this arithmetic: /60 still leaves Mosaic at 4.33:1, /62
// gives it 4.61:1.
//
// This reads the stylesheet, as faintText.test.ts does: every palette's ink at
// the share the chip writes, laid over that palette's paper, must be 4.5:1 or
// more. The unchosen chips' ratio (text-paper/45) is held there, with every
// faint share the app writes.
//
// What it cannot see: the screen. checkMock with pixels on the export
// measures the Size tab (docs/handoffs/updates-58-runners/mockrun58.mjs, pic-2).
//
// What a reader would notice if this broke: the chosen size's ratio too faint
// to read on most dark palettes.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { READING_THEMES } from "@/lib/reader/readingModes";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8").replace(/\r\n/g, "\n");
const SHEET = read("components/share/PictureSheet.tsx");
const CSS = read("app/globals.css");
const BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

type Rgb = [number, number, number];

function hex(raw: string): Rgb {
  const m = /#([0-9a-f]{6})\b/i.exec(raw);
  if (!m) throw new Error(`not a colour: ${raw}`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as Rgb;
}

/** A custom property's value in the first rule whose selector is exactly `selector`. */
function token(selector: string, name: string): string | null {
  for (const m of BARE.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if ((m[1].split(";").pop() ?? "").trim() !== selector) continue;
    const d = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(m[2]);
    if (d) return d[1].trim();
  }
  return null;
}

const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const mix = (fg: Rgb, bg: Rgb, a: number): Rgb => fg.map((v, i) => v * a + bg[i] * (1 - a)) as Rgb;
const ratio = (a: Rgb, b: Rgb) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** The five palettes and the two earned by reading, as data-reading-mode wears them, then the fourteen looks. */
function palettes(): { name: string; night: Rgb; paper: Rgb }[] {
  const worn: [string, string | null][] = [
    ["Dark", null],
    ["Light", "parchment"],
    ["Black", "black"],
    ["Candlelight", "candlelight"],
    ["Monastery", "monastery"],
    ...READING_THEMES.filter((theme) => theme.collection).map((theme): [string, string] => [theme.label, theme.id]),
  ];
  const own = (selector: string | null, name: string) => {
    const raw = (selector ? token(selector, name) : null) ?? token("@theme", name) ?? token(":root", name);
    if (!raw) throw new Error(`${selector ?? "Dark"}: no ${name}`);
    return hex(raw);
  };
  const all = worn.map(([name, mode]) => {
    const selector = mode ? `html[data-reading-mode="${mode}"]` : null;
    return { name, night: own(selector, "--color-night"), paper: own(selector, "--color-paper") };
  });
  for (const theme of READING_THEMES.filter((t) => t.look)) {
    const selector = `html[data-look="${theme.id}"]`;
    const pick = (name: string) => {
      const raw = token(selector, name);
      if (!raw) throw new Error(`${theme.id}: no ${name}`);
      return hex(raw);
    };
    all.push({ name: theme.label, night: pick("--color-night"), paper: pick("--color-paper") });
  }
  return all;
}

describe("the picture sheet's Size tab", () => {
  const chip = /style\.shape === s \? "text-night\/(\d+)" : "text-paper\/(\d+)"\)\}>\{SHAPE_RATIOS\[s\]\}/.exec(SHEET);

  it("draws the chosen chip as the arithmetic assumes: the ink on the paper, the ratio in the same ink", () => {
    expect(chip, "the Size chips' ratio, written as one class for the chosen chip and one for the rest").not.toBeNull();
    const on = /const ON = "([^"]+)";/.exec(SHEET)?.[1] ?? "";
    expect(on.split(" ")).toEqual(expect.arrayContaining(["bg-paper", "text-night"]));
    expect(SHEET).toMatch(/style\.shape === s \? ON : /);
    // No palette redraws the share, so what the stylesheet says is what is drawn.
    expect(CSS).not.toContain(`.text-night\\/${chip?.[1]}`);
  });

  it("holds the chosen shape's ratio at 4.5:1 or more on every one of the 21 palettes", () => {
    const share = Number(chip?.[1]) / 100;
    expect(share > 0 && share <= 1, "the chosen chip's share, read from the sheet").toBe(true);
    const all = palettes();
    expect(all.length).toBe(21);
    const under = all
      .map(({ name, night, paper }) => ({ name, r: ratio(mix(night, paper, share), paper) }))
      .filter(({ r }) => r < 4.5)
      .map(({ name, r }) => `${name} ${r.toFixed(2)}:1`);
    expect(under, `text-night/${chip?.[1]} on the chosen chip`).toEqual([]);
  });
});
