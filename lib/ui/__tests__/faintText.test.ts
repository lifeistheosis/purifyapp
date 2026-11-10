// Faint text is legible on every palette (1.9, build 88 note 4).
//
// The app's grey lines are the palette's ink at 45 to 60 percent
// (text-paper/45 to /60, about 1,550 uses). On Light every one of them was
// under WCAG AA's 4.5:1, and on Candlelight, Monastery, Councils, Cappadocian
// and even Dark some fell short on a card. app/globals.css ("Faint text on
// every palette") draws each palette's short shares at the share it needs.
//
// This reads the stylesheet, as litPalette.test.ts does, and does the
// arithmetic: every palette's ink, at every faint share as the stylesheet
// finally draws it, against the page, a card and a 4 percent box, must be
// 4.5:1 or more. A new palette, or a nudge to a token or a share, that falls
// under fails here.
//
// What a reader would notice if this broke: captions, dates and counts too
// faint to read on one palette, most likely Light.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
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

const MODES = ["default", "parchment", "black", "candlelight", "monastery", "councils", "cappadocian"] as const;
type Mode = (typeof MODES)[number];

function colours(mode: Mode): { night: Rgb; soft: Rgb; paper: Rgb } {
  const pick = (name: string) => {
    const own = mode === "default" ? null : token(`html[data-reading-mode="${mode}"]`, name);
    const base = token("@theme", name) ?? token(":root", name);
    const raw = own ?? base;
    if (!raw) throw new Error(`${mode}: no ${name}`);
    return hex(raw);
  };
  return { night: pick("--color-night"), soft: pick("--color-night-soft"), paper: pick("--color-paper") };
}

const SHARES = [45, 50, 55, 60] as const;

/** The share each palette finally draws text-paper/<share> at, from the stylesheet's own rules. */
function drawn(mode: Mode, share: number): number {
  let out = share;
  const rule = /:where\(([^)]*(?:\([^)]*\)[^)]*)*)\)\s*(:is\(([^)]*)\)|\.text-paper\\\/(\d+))\s*\{\s*color:\s*([^;]+);/g;
  for (const m of BARE.matchAll(rule)) {
    const where = m[1];
    const forMode = mode === "default" ? /html:not\(\[data-reading-mode\]\)/.test(where) : where.includes(`data-reading-mode="${mode}"`);
    if (!forMode) continue;
    const classes = m[3] ? [...m[3].matchAll(/\.text-paper\\\/(\d+)/g)].map((c) => Number(c[1])) : [Number(m[4])];
    if (!classes.includes(share)) continue;
    const value = m[5];
    const pct = /var\(--color-paper\)\s+(\d+(?:\.\d+)?)%/.exec(value);
    const alpha = /\/\s*(0?\.\d+)\s*\)/.exec(value);
    if (pct) out = Number(pct[1]);
    else if (alpha) out = Number(alpha[1]) * 100;
  }
  return out;
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

describe("faint text on every palette", () => {
  it("reads the seven palettes from the stylesheet", () => {
    for (const mode of MODES) {
      const c = colours(mode);
      expect(c.night.every(Number.isFinite) && c.paper.every(Number.isFinite), mode).toBe(true);
    }
    // Light is the one light palette: ink darker than the page.
    expect(lum(colours("parchment").paper)).toBeLessThan(lum(colours("parchment").night));
  });

  for (const mode of MODES) {
    it(`${mode}: every share from 45 to 60 percent is 4.5:1 or more on the page, a card and a 4 percent box`, () => {
      const { night, soft, paper } = colours(mode);
      const grounds: Record<string, Rgb> = { page: night, card: soft, box: mix(paper, night, 0.04) };
      const short: string[] = [];
      for (const share of SHARES) {
        const at = drawn(mode, share) / 100;
        for (const [where, ground] of Object.entries(grounds)) {
          const r = ratio(mix(paper, ground, at), ground);
          if (r < 4.5) short.push(`text-paper/${share} drawn at ${Math.round(at * 100)}% on the ${where}: ${r.toFixed(2)}:1`);
        }
      }
      expect(short, short.join("\n")).toEqual([]);
    });
  }

  it("the rules sit in the utilities layer, under :where(), so a hover still wins", () => {
    const block = CSS.slice(CSS.indexOf("Faint text on every palette"));
    const layer = block.slice(block.indexOf("@layer utilities {"), block.indexOf("@layer utilities {") + 1200);
    expect(layer).toContain(':where(html[data-reading-mode="parchment"])');
    expect(layer).toContain(":where(html:not([data-reading-mode]))");
    expect(layer).not.toMatch(/!important/);
  });
});

// Two lines of words were left at 40 percent, under the shares above, as
// though decorative: the week's day letters under the streak (the prayer rope,
// on Today, on You and on the evening card) and the Bible's name after the
// Verse of the Day's reference (", King James Version"). The Themes chat
// measured them on 2026-11-10 at 3.8:1 on Dark and True black, 2.3:1 on
// Light, 2.9:1 on Candlelight and 3.3:1 on Monastery. They are words a reader
// reads, so they wear the faintest share the rules above hold to 4.5:1.
describe("words once drawn at 40 percent", () => {
  for (const file of ["components/streak/PrayerRope.tsx", "components/today/VerseOfDayView.tsx"]) {
    it(`${file}: every text share is one the rules hold`, () => {
      const src = readFileSync(join(process.cwd(), file), "utf8");
      const shares = [...src.matchAll(/\btext-paper\/(\d+)\b/g)].map((m) => Number(m[1]));
      expect(shares.length, file).toBeGreaterThan(0);
      const under = shares.filter((share) => share < SHARES[0]);
      expect(under, `${file}: text-paper/${under.join(", /")} is under the faintest share held to 4.5:1`).toEqual([]);
    });
  }
});
