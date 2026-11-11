import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The house's question before an act that matters (components/ui/ConfirmDialog.tsx)
 * can be read on every palette.
 *
 * Until 2026-11-11 its card's gradient was Dark's two night colours typed
 * out: rgba(29,29,32,0.65) above and rgba(16,16,19,0.95) below. Its words are
 * the palette's (`text-paper`), so on Light, where paper is dark ink, the
 * card stayed near-black under words that had turned dark. Measured on a
 * drawing of a campaign's take-down question (scripts/mock-campaigns.mjs,
 * still 48): the title 2.01:1, the question 1.42:1, Cancel 1.07:1, the act
 * itself 1.82:1. A reader on Light, the free light palette, was asked a
 * question they could not read, with the safe answer invisible beside the
 * red one. Seventeen files ask through this one component: removing a post,
 * a note or a gathering, signing out everywhere, taking a campaign down.
 *
 * No drawing could have said so: the card lets a little of the page through,
 * so the mock checker (scripts/mock-check.mjs) does not measure its words
 * and says "look", and it was looked at on Dark. So this does the
 * arithmetic, in the idiom of litPalette.test.ts: the ground is read from the
 * component, the palettes from app/globals.css, and each of the dialog's
 * words is held to WCAG's 4.5:1 at the top of the card and at its foot, on
 * all five palettes.
 */

const code = readFileSync(join(process.cwd(), "components/ui/ConfirmDialog.tsx"), "utf8");
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

type Rgb = [number, number, number];
type Paint = { rgb: Rgb; a: number };
type Tokens = Record<string, Rgb>;

function hex(value: string): Rgb {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!m) throw new Error(`not a hex colour: ${value}`);
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

/** Every `--color-*` a palette sets: all the blocks under its selector, the later over the earlier. */
function tokensUnder(selector: string): Tokens {
  const found: Tokens = {};
  const lines = css.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== `${selector} {`) continue;
    for (let j = i + 1; j < lines.length && lines[j].trim() !== "}"; j++) {
      const m = /^\s*--color-([\w-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/.exec(lines[j]);
      if (m) found[m[1]] = hex(m[2]);
    }
  }
  return found;
}

const DARK = tokensUnder("@theme");
/** The five palettes, as AppThemeController wears them (scripts/mock-check.mjs, PALETTES). */
const PALETTES: [string, Tokens][] = [
  ["Dark", DARK],
  ["Light", { ...DARK, ...tokensUnder('html[data-reading-mode="parchment"]') }],
  ["Black", { ...DARK, ...tokensUnder('html[data-reading-mode="black"]') }],
  ["Candlelight", { ...DARK, ...tokensUnder('html[data-reading-mode="candlelight"]') }],
  ["Monastery", { ...DARK, ...tokensUnder('html[data-reading-mode="monastery"]') }],
];

/** One colour laid over another, as the browser lays it. */
const over = (top: Paint, under: Rgb): Rgb => top.rgb.map((v, i) => top.a * v + (1 - top.a) * under[i]) as Rgb;
const linear = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]: Rgb) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The ground the card is given, as the component writes it. */
function cardGround(source: string): string {
  const m = /const CARD_GROUND =\s*"([^"]+)"/.exec(source) ?? /backgroundImage:\s*"(linear-gradient\([^"]+)"/.exec(source);
  if (!m) throw new Error("the card's ground is not where this test reads it");
  return m[1];
}

/** A gradient's two stops, on a palette: a colour typed in, or one of the palette's own by name. */
function stops(gradient: string, tokens: Tokens): [Paint, Paint] {
  const found: Paint[] = [];
  const stop = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)|color-mix\(in srgb, var\(--color-([\w-]+)\) (\d+)%, transparent\)/g;
  for (const m of gradient.matchAll(stop)) {
    if (m[5]) {
      const rgb = tokens[m[5]];
      if (!rgb) throw new Error(`the palette has no --color-${m[5]}`);
      found.push({ rgb, a: Number(m[6]) / 100 });
    } else {
      found.push({ rgb: [Number(m[1]), Number(m[2]), Number(m[3])], a: Number(m[4]) });
    }
  }
  if (found.length !== 2) throw new Error(`two stops were expected in: ${gradient}`);
  return [found[0], found[1]];
}

/**
 * The dialog's words on a palette, each against the ground under it, at the
 * top of the card and at its foot. Between the two the ground moves in a
 * straight line, so the least contrast is at one end or the other.
 */
function words(gradient: string, tokens: Tokens): { name: string; least: number }[] {
  const { night, paper, crimson, gold } = tokens;
  // The page behind, then the card's own `bg-night-soft/95`, then the gradient's stop.
  const base = over({ rgb: tokens["night-soft"], a: 0.95 }, night);
  const ends = stops(gradient, tokens).map((s) => over(s, base));
  const on = (ink: Paint, wash?: Paint) =>
    Math.min(
      ...ends.map((ground) => {
        const under = wash ? over(wash, ground) : ground;
        return contrast(over(ink, under), under);
      }),
    );
  return [
    { name: "the title", least: on({ rgb: paper, a: 1 }) },
    { name: "the question", least: on({ rgb: paper, a: 0.7 }) },
    { name: "Cancel", least: on({ rgb: paper, a: 0.85 }, { rgb: paper, a: 0.04 }) },
    { name: "the act, a removal", least: on({ rgb: tokens["crimson-soft"], a: 1 }, { rgb: crimson, a: 0.1 }) },
    { name: "the act, any other", least: on({ rgb: gold, a: 1 }, { rgb: gold, a: 0.15 }) },
  ];
}

/** As it was typed until 2026-11-11. */
const TYPED = "linear-gradient(180deg, rgba(29,29,32,0.65) 0%, rgba(16,16,19,0.95) 100%)";

describe("the confirm dialog's card follows the reader's palette (found on a campaign's take-down question, 2026-11-11)", () => {
  const ground = cardGround(code);

  it("its ground is the palette's own night, by name, with no colour typed into it", () => {
    expect(ground).toContain("var(--color-night-soft)");
    expect(ground).toContain("var(--color-night)");
    expect(ground).not.toMatch(/rgba?\(|#[0-9a-f]{3,8}\b/i);
    // And the card is given that ground, over the palette's own surface.
    expect(code).toMatch(/className="[^"]*\bbg-night-soft\/95\b[^"]*"\s*style=\{\{[^}]*backgroundImage: CARD_GROUND,/);
  });

  it("on Dark it is the ground it always was: the same two stops, mixed in sRGB as they were", () => {
    const [top, foot] = stops(ground, DARK);
    expect(top).toEqual({ rgb: [29, 29, 32], a: 0.65 });
    expect(foot).toEqual({ rgb: [16, 16, 19], a: 0.95 });
    expect(stops(TYPED, DARK)).toEqual([top, foot]);
    // Stops made by color-mix are not the old kind of colour, and a gradient between such
    // stops is mixed in Oklab unless it is told otherwise; told, Dark's card is unchanged.
    expect(ground).toMatch(/^linear-gradient\(180deg in srgb, /);
  });

  it("the words this arithmetic reads are the words the dialog draws", () => {
    expect(code).toMatch(/id="confirm-dialog-title"\s*className="[^"]*\btext-paper\b(?!\/)/);
    expect(code).toMatch(/<p className="[^"]*\btext-paper\/70\b[^"]*">\s*\{description\}/);
    expect(code).toMatch(/onClick=\{onCancel\}[\s\S]{0,80}className="[^"]*\bbg-paper\/\[0\.04\] text-paper\/85\b/);
    expect(code).toContain('? "bg-crimson/[0.10] border-crimson/55 text-crimson-soft ');
    expect(code).toContain(': "bg-gold/15 border-gold/50 text-gold ');
  });

  for (const [palette, tokens] of PALETTES) {
    it(`on ${palette}, the title, the question and both answers can be read: 4.5 to 1 at the least, top of the card to its foot`, () => {
      for (const word of words(ground, tokens)) {
        expect(word.least, `${word.name} on ${palette}: ${word.least.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it("as it was typed, it failed on Light and nowhere else, as the drawing measured", () => {
    const light = words(TYPED, PALETTES[1][1]);
    // Every line of it, the red answer included.
    for (const word of light.filter((w) => w.name !== "the act, any other")) {
      expect(word.least, `${word.name}: ${word.least.toFixed(2)}:1`).toBeLessThan(2.1);
    }
    expect(light.find((w) => w.name === "Cancel")?.least).toBeLessThan(1.2);
    for (const [palette, tokens] of PALETTES.filter(([name]) => name !== "Light")) {
      for (const word of words(TYPED, tokens)) {
        expect(word.least, `${word.name} on ${palette}: ${word.least.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("a removal's red edge is allowed by name: one alert red on every palette, and only on a removal", () => {
    // The checker reads a colour that is the same on Dark and on Light as one typed in.
    // --color-crimson is the same on both by the house's own choice; the words beside it follow the palette.
    expect(DARK.crimson).toEqual(PALETTES[1][1].crimson);
    expect(DARK["crimson-soft"]).not.toEqual(PALETTES[1][1]["crimson-soft"]);
    expect(code).toContain('data-mock-allow={destructive ? "palette" : undefined}');
    expect(code).toMatch(/data-mock-why=\{destructive \? "[^"]+--color-crimson[^"]*" : undefined\}/);
    expect(code.match(/data-mock-allow/g)).toHaveLength(1);
  });
});
