// The prayer page's reading light keeps every word legible (1.9, his "ok to
// all" of 2026-11-10 on his page's 131).
//
// While the reader follows, the line being prayed is lit, the prayer's other
// lines step back, and the prayers before and after step back further
// (components/prayers/service/useLitLine.ts, the owner's pick B of 1.8). The
// steps were 40% and 40% of 50%, and checkMock measured them on the export at
// 3.82:1 on Dark down to 1.47:1 on Light, against the 4.5:1 every word is held
// to. app/globals.css ("The rest dim") now gives each palette its own two
// steps, --prayer-rest and --prayer-unlit.
//
// This reads the stylesheet, as faintText.test.ts does, and does the
// arithmetic: the faintest words that step back (the closing line, the ink at
// 85%, and a prayer's name, at 90%) must hold 4.5:1 on every palette's page at
// both steps, the steps must still be steps (rest under unlit under the lit
// line), and the step back must not reach the captions and notes, which are
// already the faint shares and have nothing to spare.
//
// What a reader would notice if this broke: the lines around the one being
// prayed too faint to read, most of all on Light.

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

/** A rule's selectors, one per comma (none of these selectors holds a comma of its own). */
const selectorsOf = (head: string) => (head.split(";").pop() ?? "").split(",").map((s) => s.trim());

/** The rules one of whose selectors is exactly `selector`, as their declarations. */
function rules(selector: string): string[] {
  const out: string[] = [];
  for (const m of BARE.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if (selectorsOf(m[1]).includes(selector)) out.push(m[2]);
  }
  return out;
}

/** A custom property's value in the first rule whose selector is exactly `selector`. */
function token(selector: string, name: string): string | null {
  for (const body of rules(selector)) {
    const d = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(body);
    if (d) return d[1].trim();
  }
  return null;
}

const MODES = ["default", "parchment", "black", "candlelight", "monastery", "councils", "cappadocian"] as const;
type Mode = (typeof MODES)[number];

function colours(mode: Mode): { night: Rgb; paper: Rgb } {
  const pick = (name: string) => {
    const own = mode === "default" ? null : token(`html[data-reading-mode="${mode}"]`, name);
    const raw = own ?? token("@theme", name) ?? token(":root", name);
    if (!raw) throw new Error(`${mode}: no ${name}`);
    return hex(raw);
  };
  return { night: pick("--color-night"), paper: pick("--color-paper") };
}

/** The palette's two steps: its own rule if it has one, else the reader's base. */
function steps(mode: Mode): { rest: number; unlit: number } {
  const own = mode === "default" ? null : `html[data-reading-mode="${mode}"] [data-prayer-reader]`;
  const read = (name: string) => {
    const raw = (own ? token(own, name) : null) ?? token("[data-prayer-reader]", name);
    if (!raw) throw new Error(`${mode}: no ${name}`);
    return Number(raw);
  };
  return { rest: read("--prayer-rest"), unlit: read("--prayer-unlit") };
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

/** The faintest words that step back, at the share of the ink each is drawn at. */
const STEPPING = [
  ["a line", 1],
  ["a prayer's name (text-paper/90)", 0.9],
  ["the closing line (text-paper/85)", 0.85],
] as const;

describe("the prayer page's reading light", () => {
  for (const mode of MODES) {
    it(`${mode}: every word that steps back holds 4.5:1 on the page at both steps`, () => {
      const { night, paper } = colours(mode);
      const { rest, unlit } = steps(mode);
      const short: string[] = [];
      for (const [step, at] of [["the prayers before and after", rest], ["the prayer being prayed", unlit]] as const) {
        for (const [what, share] of STEPPING) {
          // A prayer's name steps back only with the prayers around it.
          if (step === "the prayer being prayed" && share === 0.9) continue;
          const r = ratio(mix(paper, night, share * at), night);
          if (r < 4.5) short.push(`${what} in ${step}, at ${Math.round(at * 100)}%: ${r.toFixed(2)}:1`);
        }
      }
      expect(short, short.join("\n")).toEqual([]);
    });

    it(`${mode}: the steps are still steps`, () => {
      const { rest, unlit } = steps(mode);
      expect(rest).toBeGreaterThan(0);
      expect(rest, "the prayers around step back further than the prayer's own lines").toBeLessThan(unlit);
      expect(unlit, "the lit line stands out from the rest").toBeLessThan(1);
    });
  }

  it("the light uses the palette's steps, not a fixed share", () => {
    const unlit = rules(':where([data-motion="full"]) [data-prayer-reader][data-following] [data-line]').join("");
    expect(unlit).toMatch(/opacity:\s*var\(--prayer-unlit\)/);
    const lit = rules(':where([data-motion="full"]) [data-prayer-reader][data-following] [data-line][data-lit]').join("");
    expect(lit).toMatch(/opacity:\s*1\b/);
    const around = ':where([data-motion="full"]) [data-prayer-reader][data-following] [data-step]:not([data-praying])';
    for (const part of ["[data-line]", "> h2"]) {
      expect(rules(`${around} ${part}`).join(""), part).toMatch(/opacity:\s*var\(--prayer-rest\)/);
    }
  });

  it("the step back reaches the lines and the names, never the captions and notes", () => {
    // Every selector that dims inside the reader.
    const dimming = [...BARE.matchAll(/([^{}]*\[data-prayer-reader\][^{}]*)\{([^{}]*)\}/g)]
      .filter((m) => /opacity\s*:/.test(m[2]) && !/opacity\s*:\s*1\b/.test(m[2]))
      .flatMap((m) => selectorsOf(m[1]));
    expect(dimming.length).toBeGreaterThan(0);
    for (const selector of dimming) {
      // The old rule dimmed every child of a step (`> :not([data-step-actions])`),
      // which took the captions, already the faint shares, under 4.5:1.
      expect(selector, `${selector} dims more than the lines and the names`).toMatch(/(\[data-line\]|> h2)$/);
    }
  });
});
