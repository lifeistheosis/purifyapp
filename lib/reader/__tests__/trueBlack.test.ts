// True black (1.6) makes promises a stylesheet can break with no error
// anywhere: the page is exactly #000000, the ink and accents are Dark's own
// white and silver, and nothing the palette adds is warm (no yellow, no
// gold) or cool (no blue cast). A reader on an OLED screen sees the
// difference at once; nothing in the build does.
//
// So this reads app/globals.css and holds them, in the idiom of
// lib/ui/__tests__/litPalette.test.ts, which checks this palette's contrast
// pairs alongside the others. Vitest here is a node environment with no
// DOM, and nothing else can check a colour.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const CSS = fs.readFileSync(path.resolve(__dirname, "../../../app/globals.css"), "utf8");

// Comments out first: this stylesheet explains itself at length, and a brace
// or a hex in the prose is not a rule.
const BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

const BLACK = 'html[data-reading-mode="black"]';

/** Every rule in the stylesheet as [selector, body], in source order. */
function allRules(): [string, string][] {
  const out: [string, string][] = [];
  for (const m of BARE.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    out.push([(m[1].split(";").pop() ?? "").trim(), m[2]]);
  }
  return out;
}

/** The custom properties of every rule whose selector is exactly `selector`. */
function tokens(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [sel, body] of allRules()) {
    if (sel !== selector) continue;
    for (const d of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) out[d[1]] = d[2].trim();
  }
  return out;
}

/** The rules that belong to True black: its token block and every override. */
const BLACK_RULES = allRules().filter(([sel]) => sel.includes(BLACK));

type Rgb = [r: number, g: number, b: number];

/**
 * Every colour written as a literal in a rule body: a hex, an rgb(), or the
 * bare "R G B" triplet this stylesheet uses for a token that is read through
 * `rgb(var(--x) / alpha)`. A var() is not a literal and is not this palette's
 * to answer for.
 */
function literals(body: string): { raw: string; rgb: Rgb }[] {
  const out: { raw: string; rgb: Rgb }[] = [];
  for (const m of body.matchAll(/#([0-9a-f]{6})\b/gi)) {
    const h = m[1];
    out.push({
      raw: m[0],
      rgb: [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)],
    });
  }
  for (const m of body.matchAll(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/gi)) {
    out.push({ raw: m[0], rgb: [Number(m[1]), Number(m[2]), Number(m[3])] });
  }
  for (const m of body.matchAll(/:\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*;/g)) {
    out.push({ raw: m[0], rgb: [Number(m[1]), Number(m[2]), Number(m[3])] });
  }
  return out;
}

/** A six-digit hex as its three channels. */
function hexRgb(raw: string | undefined): Rgb {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(raw ?? "");
  if (!m) throw new Error(`not a six-digit hex: ${raw}`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

/** WCAG relative luminance of an opaque colour. */
function luminance([r, g, b]: Rgb): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

/** The contrast of white at `alpha` against the opaque ground it lies on. */
function whiteOn(alpha: number, [r, g, b]: Rgb): number {
  const flat = (v: number) => 255 * alpha + v * (1 - alpha);
  return (luminance([flat(r), flat(g), flat(b)]) + 0.05) / (luminance([r, g, b]) + 0.05);
}

describe("the True black palette", () => {
  const black = tokens(BLACK);

  it("is in the stylesheet, with its overrides", () => {
    expect(Object.keys(black).length).toBeGreaterThan(6);
    expect(BLACK_RULES.length).toBeGreaterThan(3);
  });

  it("paints the page exactly #000000", () => {
    expect(black["--color-night"]).toBe("#000000");
  });

  it("puts nothing below black: the recessed well is the page", () => {
    expect(black["--color-night-deep"]).toBe(black["--color-night"]);
  });

  it("keeps a card off the page, and still very dark", () => {
    // One step of neutral grey. Too close to 00 and a card with no border
    // is lost on an LCD; much past 24 and it stops being a black theme.
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(black["--color-night-soft"] ?? "");
    expect(m, "--color-night-soft must be a six-digit hex").not.toBeNull();
    const [r, g, b] = [m![1], m![2], m![3]].map((h) => parseInt(h, 16));
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(r).toBeGreaterThanOrEqual(0x10);
    expect(r).toBeLessThanOrEqual(0x24);
  });

  it("keeps Dark's own ink and accents", () => {
    // True black is the Dark palette with the ground switched off, not a
    // second look. If Dark's accent ever moves, this one moves with it.
    const dark = tokens("@theme");
    for (const name of ["--color-paper", "--color-gold", "--color-gold-soft", "--color-gold-pale"]) {
      expect(dark[name], `@theme lost ${name}`).toBeDefined();
      expect(black[name], name).toBe(dark[name]);
    }
  });

  it("turns the feast marks silver, as Candlelight does", () => {
    // --color-festal is real liturgical gold on Dark. This palette carries
    // no gold, so it takes the accent.
    expect(black["--color-festal"]).toBe(black["--color-gold"]);
  });

  it("adds no yellow, no gold and no blue cast", () => {
    // Every colour this palette writes is a neutral grey or the app's
    // silver, which leans cool by at most four steps (#cfcfd3). So: the
    // three channels within four of each other, and red and green never
    // above blue, which is what warm means.
    const seen = BLACK_RULES.flatMap(([sel, body]) => literals(body).map((l) => ({ sel, ...l })));
    expect(seen.length).toBeGreaterThan(10);
    for (const { sel, raw, rgb } of seen) {
      const [r, g, b] = rgb;
      const where = `${raw} in ${sel}`;
      expect(Math.max(r, g, b) - Math.min(r, g, b), `not neutral: ${where}`).toBeLessThanOrEqual(4);
      expect(r, `warm: ${where}`).toBeLessThanOrEqual(b);
      expect(g, `warm: ${where}`).toBeLessThanOrEqual(b);
    }
  });

  it("redraws the surfaces that were painted with a literal", () => {
    // A card with its own gradient keeps its graphite and its white halo
    // when the tokens turn black. These three are the phone's main cards,
    // the featured band and the full-height hero.
    for (const c of ["lm-card", "lm-feature", "lm-hero"]) {
      expect(
        BLACK_RULES.some(([sel]) => sel.includes(`${BLACK} .${c}`)),
        `no True black rule for .${c}`,
      ).toBe(true);
    }
  });

  it("switches off the glows a component lays over a ground", () => {
    // The white halo behind a page's heading and the blurred disc in a hub
    // tile's corner are elements of their own, so no token and no lm-* rule
    // reaches them. Each wears a class, and this is the rule that reads it.
    for (const c of ["page-halo", "tile-sheen"]) {
      expect(
        BLACK_RULES.some(([sel, body]) => sel.includes(`${BLACK} .${c}`) && /display:\s*none/.test(body)),
        `no True black rule hides .${c}`,
      ).toBe(true);
    }
  });

  it("lifts the text-paper/45 label over AA, and leaves its hover alone", () => {
    // White at 45 percent is 4.53:1 on Dark's page and 4.41:1 on #000000:
    // the ground is darker, but it lends a translucent label less, and the
    // ink is already pure white. So this palette raises the label's share.
    const sel = `:where(${BLACK}) .text-paper\\/45`;
    const rule = BLACK_RULES.find(([s]) => s === sel);
    expect(rule, `no rule for ${sel}`).toBeDefined();
    const m = /color:\s*rgb\(255 255 255 \/ (0?\.\d+)\)/.exec(rule![1]);
    expect(m, "the label is pure white at a plain alpha").not.toBeNull();
    const alpha = Number(m![1]);

    // The three grounds a label sits on here: the page, a card, and the
    // feature band, which is the lightest and so the hardest of the three.
    const feature = BLACK_RULES.find(([s]) => s === `${BLACK} .lm-feature`);
    const band = /background:\s*(#[0-9a-f]{6})\b/i.exec(feature?.[1] ?? "");
    expect(band, "the feature band is a plain hex").not.toBeNull();
    const grounds: [string, Rgb][] = [
      ["the page", hexRgb(black["--color-night"])],
      ["a card", hexRgb(black["--color-night-soft"])],
      ["the feature band", hexRgb(band![1])],
    ];
    for (const [name, ground] of grounds) {
      expect(Number(whiteOn(alpha, ground).toFixed(2)), `text-paper/45 on ${name}`).toBeGreaterThanOrEqual(4.5);
    }

    // In the utilities layer and under :where(), so the rule weighs what the
    // utility weighs and comes after it. A hover:text-paper on the same
    // element then still wins; a plain rule would hold the label through it.
    expect(BARE.replace(/\s+/g, " ")).toContain(`@layer utilities { ${sel} {`);
  });
});
