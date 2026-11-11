// The saint web's key and its sheet can be read on every palette (1.9,
// 2026-11-11).
//
// The key at the head of a saint's web is a carved track: its ground is a
// gradient. Until the mock checker could measure a word on a gradient
// (scripts/mock-check.mjs, the same day) every word on it was "not measured,
// look". Measured on the export, the counts beside the key's words ("4",
// "1"), the ink at 34 percent, read 3.06:1 on Dark, 2.90 on True black, 2.74
// on Monastery and 2.34 on Candlelight, and Candlelight's words, at 52, read
// 4.22. On the sheet at the foot, the dot between a saint's years and his
// kinds, at 30 percent, read 1.76:1.
//
// This reads the stylesheet and does the arithmetic, as
// lib/ui/__tests__/faintText.test.ts does: on each of the seven palettes the
// key's words and its counts are 4.5:1 or more where the key is hardest to
// read on, and a count is never stronger than its word (a step under, as
// the key was drawn).
//
// What a reader would notice if this broke: the numbers on the key too faint
// to read, on a dark palette first.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
const BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");
const CARD = readFileSync(join(process.cwd(), "components", "saints", "web", "WebCard.tsx"), "utf8");

type Rgb = [number, number, number];
const MODES = ["default", "parchment", "black", "candlelight", "monastery", "councils", "cappadocian"] as const;
type Mode = (typeof MODES)[number];
const TRIO: readonly Mode[] = ["monastery", "councils", "cappadocian"];

function hex(raw: string): Rgb {
  const m = /#([0-9a-f]{6})\b/i.exec(raw);
  if (!m) throw new Error(`not a colour: ${raw}`);
  return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) as Rgb;
}
function token(selector: string, name: string): string | null {
  for (const m of BARE.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if ((m[1].split(";").pop() ?? "").trim() !== selector) continue;
    const d = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(m[2]);
    if (d) return d[1].trim();
  }
  return null;
}
function colours(mode: Mode): { night: Rgb; paper: Rgb } {
  const pick = (name: string) => {
    const own = mode === "default" ? null : token(`html[data-reading-mode="${mode}"]`, name);
    const raw = own ?? token("@theme", name) ?? token(":root", name);
    if (!raw) throw new Error(`${mode}: no ${name}`);
    return hex(raw);
  };
  return { night: pick("--color-night"), paper: pick("--color-paper") };
}
const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const mix = (fg: Rgb, bg: Rgb, a: number): Rgb => fg.map((v, i) => v * a + bg[i] * (1 - a)) as Rgb;
const ratio = (a: Rgb, b: Rgb) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/**
 * The share of the ink a rule draws, by the rule's selector as it is written.
 * A palette with no rule of its own draws what the key draws on every palette
 * (`otherwise`), which is how the stylesheet itself falls through.
 */
function share(selector: string, otherwise?: number): number {
  const at = BARE.indexOf(`${selector} {`);
  if (at < 0 && otherwise !== undefined) return otherwise;
  if (at < 0) throw new Error(`no rule for ${selector}`);
  const body = BARE.slice(at, BARE.indexOf("}", at));
  const all = [...body.matchAll(/color: color-mix\(in srgb, var\(--color-paper\) (\d+(?:\.\d+)?)%, transparent\);/g)];
  if (!all.length) throw new Error(`${selector} draws no share of the ink`);
  return Number(all[all.length - 1][1]);
}

const TRIO_RULE = ':where(html[data-reading-mode="monastery"], html[data-reading-mode="councils"], html[data-reading-mode="cappadocian"])';
const WORD = share("\n.saint-web-key-part");
const COUNT = share("\n.saint-web-key-count");
const WORDS = {
  base: WORD,
  trio: share(`${TRIO_RULE} .saint-web-key-part`, WORD),
  candlelight: share(':where(html[data-reading-mode="candlelight"]) .saint-web-key-part', WORD),
  parchment: share('html[data-reading-mode="parchment"] .saint-web-key-part'),
};
const COUNTS = {
  base: COUNT,
  trio: share(`${TRIO_RULE} .saint-web-key-count`, COUNT),
  candlelight: share(':where(html[data-reading-mode="candlelight"]) .saint-web-key-count', COUNT),
  parchment: share('html[data-reading-mode="parchment"] .saint-web-key-count,\nhtml[data-reading-mode="parchment"] .saint-web-key-part[aria-pressed="true"] .saint-web-key-count'),
};
const wordsOn = (mode: Mode) => (mode === "parchment" ? WORDS.parchment : mode === "candlelight" ? WORDS.candlelight : TRIO.includes(mode) ? WORDS.trio : WORDS.base);
const countsOn = (mode: Mode) => (mode === "parchment" ? COUNTS.parchment : mode === "candlelight" ? COUNTS.candlelight : TRIO.includes(mode) ? COUNTS.trio : COUNTS.base);

/**
 * The key where it is hardest to read on. On a dark palette its carved
 * ground runs from black laid over the page to a little of the ink laid
 * over it, and the foot, the lightest, is the hard end. Light has a ground
 * of its own, one colour.
 */
function keyGround(mode: Mode): Rgb {
  const { night, paper } = colours(mode);
  if (mode === "parchment") {
    const own = /html\[data-reading-mode="parchment"\] \.saint-web-key \{\s*background: color-mix\(in srgb, var\(--color-paper\) (\d+(?:\.\d+)?)%, var\(--color-night\)\);/.exec(BARE);
    if (!own) throw new Error("no ground for the key on Light");
    return mix(paper, night, Number(own[1]) / 100);
  }
  const carved = /\.saint-web-key \{[^}]*linear-gradient\(180deg, rgb\(0 0 0 \/ (0?\.\d+)\), color-mix\(in srgb, var\(--color-paper\) (\d+(?:\.\d+)?)%, transparent\)\), var\(--color-night\);/.exec(BARE);
  if (!carved) throw new Error("no ground for the key");
  const stops: Rgb[] = [mix([0, 0, 0], night, Number(carved[1])), mix(paper, night, Number(carved[2]) / 100)];
  return stops.reduce((a, b) => (lum(a) > lum(b) ? a : b));
}

describe("the saint web's key can be read on every palette", () => {
  for (const mode of MODES) {
    it(`${mode}: the key's words and their counts are 4.5:1 or more where the key is hardest to read on`, () => {
      const { paper } = colours(mode);
      const ground = keyGround(mode);
      const words = ratio(mix(paper, ground, wordsOn(mode) / 100), ground);
      const counts = ratio(mix(paper, ground, countsOn(mode) / 100), ground);
      expect(words, `the words at ${wordsOn(mode)}%: ${words.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      expect(counts, `the counts at ${countsOn(mode)}%: ${counts.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    });

    it(`${mode}: a count is a step under its word, never over it`, () => {
      expect(countsOn(mode)).toBeLessThan(wordsOn(mode));
    });
  }

  it("the chosen part keeps its own ink: the palettes' rules weigh less than its own", () => {
    // Under :where(), each weighs what .saint-web-key-part does, so the chosen part's rules, written after them, win.
    for (const rule of [
      ':where(html[data-reading-mode="candlelight"]) .saint-web-key-part {',
      ':where(html[data-reading-mode="candlelight"]) .saint-web-key-count {',
      `${TRIO_RULE} .saint-web-key-part {`,
      `${TRIO_RULE} .saint-web-key-count {`,
    ]) {
      // Wherever one is written, it is written before the chosen part's.
      if (BARE.indexOf(rule) < 0) continue;
      expect(BARE.indexOf(rule), rule).toBeLessThan(BARE.indexOf('.saint-web-key-part[aria-pressed="true"] {'));
    }
  });
});

describe("the saint web's sheet", () => {
  it("the dot between a saint's years and his kinds takes the line's own ink", () => {
    const dot = /<span aria-hidden className="([^"]*)">·<\/span>/.exec(CARD);
    expect(dot, "the dot in the sheet's line").not.toBeNull();
    expect(dot?.[1]).not.toMatch(/text-paper\/\d+/);
  });
});
