// The highlight palette (1.7.1, lib/bible/highlightPalette.ts) makes promises
// no build can see: no colour but the yellow highlight (back in 1.8) is
// yellow, none is gold or orange, every wash is quiet but
// plainly there, the words stay legible through it in every reading mode, and
// no highlight a reader made before is lost. This reads the palette and the
// stylesheet's own palettes (app/globals.css) and does the arithmetic, the
// way lib/reader/__tests__/trueBlack.test.ts and
// lib/ui/__tests__/litPalette.test.ts do: vitest here is a node environment
// with no DOM, and nothing else can check a colour.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_HIGHLIGHT_COLOR,
  HIGHLIGHT_COLORS,
  colorById,
  colorNameKey,
  highlightVars,
  isHighlightColor,
  type HighlightColor,
} from "../highlightPalette";

const ROOT = path.resolve(__dirname, "../../..");
const CSS = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

// ── Colour arithmetic ──────────────────────────────────────────────────────

type Rgb = [number, number, number];

function parse(raw: string): { rgb: Rgb; a: number } {
  const v = raw.trim();
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(v);
  if (hex) return { rgb: [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)], a: 1 };
  const fn = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(v);
  if (fn) return { rgb: [Number(fn[1]), Number(fn[2]), Number(fn[3])], a: fn[4] === undefined ? 1 : Number(fn[4]) };
  throw new Error(`not a colour: ${raw}`);
}

/** Source-over, in the gamma space browsers composite in. */
function over(top: string, under: Rgb): Rgb {
  const { rgb, a } = parse(top);
  return rgb.map((c, i) => c * a + under[i] * (1 - a)) as Rgb;
}

const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function oklab([r, g, b]: Rgb): [number, number, number] {
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
/** OKLab difference, in hundredths: about 2 is the least an eye tells apart. */
function deltaE(a: Rgb, b: Rgb): number {
  const [x, y] = [oklab(a), oklab(b)];
  return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}
function hue(c: Rgb): { h: number; chroma: number } {
  const [, a, b] = oklab(c);
  return { h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360, chroma: Math.hypot(a, b) };
}

// ── The reading modes, as the stylesheet draws them ────────────────────────

/** The custom properties of every rule whose selector is exactly this. */
function tokens(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of CSS.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if ((m[1].split(";").pop() ?? "").trim() !== selector) continue;
    for (const d of m[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) out[d[1]] = d[2].trim();
  }
  return out;
}

type Mode = { id: string; light: boolean; ground: Rgb; card: Rgb; ink: Rgb };

const BASE = tokens("@theme");
const MODES: Mode[] = ["default", "black", "candlelight", "monastery", "councils", "cappadocian", "parchment"].map((id) => {
  const own = id === "default" ? {} : tokens(`html[data-reading-mode="${id}"]`);
  const pick = (k: string) => {
    const v = own[k] ?? BASE[k];
    if (!v) throw new Error(`${id}: no ${k}`);
    return parse(v).rgb;
  };
  return { id, light: id === "parchment", ground: pick("--color-night"), card: pick("--color-night-soft"), ink: pick("--color-paper") };
});

/** The colour's values in a mode: Parchment wears `light`, every other mode `dark`. */
const theme = (c: HighlightColor, m: Mode) => (m.light ? c.light : c.dark);

/** The reader's words: paper at 90% (ChapterReader's text-paper/90), over what is behind them. */
const words = (m: Mode, behind: Rgb) => over(`rgba(${m.ink.join(", ")}, 0.9)`, behind);

const PRIMARY = new Set(["default", "black", "parchment"]);

describe("the highlight palette", () => {
  it("is five to seven colours, with ids the server accepts, the first the default", () => {
    expect(HIGHLIGHT_COLORS.length).toBeGreaterThanOrEqual(5);
    expect(HIGHLIGHT_COLORS.length).toBeLessThanOrEqual(7);
    const ids = HIGHLIGHT_COLORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    // public.annotations.color is checked `^[a-z]{1,16}$`
    // (docs/1.7-build/sql/annotation-color-and-journal.sql).
    for (const id of ids) expect(id).toMatch(/^[a-z]{1,16}$/);
    expect(DEFAULT_HIGHLIGHT_COLOR).toBe(ids[0]);
    expect(new Set(HIGHLIGHT_COLORS.map((c) => c.name)).size).toBe(ids.length);
  });

  it("keeps every colour a reader highlighted in before 1.7.1, under the same id", () => {
    for (const id of ["yellow", "green", "blue", "rose", "purple"]) {
      expect(isHighlightColor(id), id).toBe(true);
      expect(colorById(id).id).toBe(id);
    }
    // An id this build does not know is drawn in the first colour, not dropped.
    expect(colorById("gold").id).toBe(DEFAULT_HIGHLIGHT_COLOR);
    expect(colorById(undefined).id).toBe(DEFAULT_HIGHLIGHT_COLOR);
  });

  it("draws yellow yellow again, first, and keeps red under an id of its own (1.8)", () => {
    // The owner, 2026-10-19: "bring back yellow highlight option (just for
    // highlighting text)". A highlight made yellow before 1.7.1 returns as it
    // was made; red, which 1.7.1 kept under "yellow", has "red".
    expect(HIGHLIGHT_COLORS[0].id).toBe("yellow");
    expect(colorById("yellow").name).toBe("yellow");
    expect(colorById("red").name).toBe("red");
    expect(DEFAULT_HIGHLIGHT_COLOR).toBe("yellow");
  });

  it("keeps yellow to the yellow highlight alone: no other colour is yellow, gold or orange", () => {
    // OKLCH hue: orange is about 70, gold 81, amber 84, yellow 95, olive 110.
    const banned = (h: number) => h >= 45 && h <= 115;
    for (const c of HIGHLIGHT_COLORS) {
      for (const m of MODES.filter((x) => x.id === "default" || x.id === "parchment")) {
        const t = theme(c, m);
        for (const [what, rgb] of [
          ["wash", over(t.wash, m.ground)],
          ["mark", parse(t.mark).rgb],
          ["swatch", parse(t.swatch).rgb],
        ] as const) {
          const { h, chroma } = hue(rgb);
          expect(chroma, `${c.name} ${what} on ${m.id} is a colour`).toBeGreaterThan(0.03);
          if (c.name === "yellow") {
            // A highlighter's yellow, never the gold or the orange the screens ban.
            expect(h >= 90 && h <= 110, `yellow ${what} on ${m.id}: hue ${h.toFixed(0)}`).toBe(true);
          } else {
            expect(banned(h), `${c.name} ${what} on ${m.id}: hue ${h.toFixed(0)}`).toBe(false);
          }
        }
      }
      // The hue the palette says is the hue it draws.
      const drawn = hue(parse(c.dark.swatch).rgb).h;
      const off = Math.abs(((drawn - c.hue + 540) % 360) - 180);
      expect(off, `${c.name}: declared ${c.hue}, drawn ${drawn.toFixed(0)}`).toBeLessThan(8);
    }
  });

  it("keeps the words legible through every wash, in every reading mode", () => {
    for (const m of MODES) {
      for (const c of HIGHLIGHT_COLORS) {
        const t = theme(c, m);
        for (const [where, ground] of [
          ["page", m.ground],
          ["card", m.card],
        ] as const) {
          const wash = over(t.wash, ground);
          const ratio = contrast(words(m, wash), wash);
          // AAA on the three palettes most readers use, AA on every one.
          const floor = PRIMARY.has(m.id) && where === "page" ? 7 : 4.5;
          expect(ratio, `${c.name} wash, ${m.id} ${where}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(floor);
        }
        // A marked word: the same through the mark, alone or inside a wash.
        const mark = parse(t.mark).rgb;
        const ratio = contrast(words(m, mark), mark);
        expect(ratio, `${c.name} mark, ${m.id}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("lays every wash plainly on the page, the mark a step stronger, and never a white patch", () => {
    for (const m of MODES) {
      for (const c of HIGHLIGHT_COLORS) {
        const t = theme(c, m);
        const wash = over(t.wash, m.ground);
        const d = deltaE(wash, m.ground);
        // Until 1.7.1 the washes on Parchment were 2 to 4 from the paper.
        expect(d, `${c.name} wash on ${m.id}: ${d.toFixed(1)}`).toBeGreaterThanOrEqual(8);
        // A wash darkens the paper and lightens the dark page, always.
        const [L] = oklab(wash);
        const [G] = oklab(m.ground);
        if (m.light) expect(L, `${c.name} on ${m.id}`).toBeLessThan(G);
        else expect(L, `${c.name} on ${m.id}`).toBeGreaterThan(G);
        const [M] = oklab(parse(t.mark).rgb);
        if (m.light) expect(M, `${c.name} mark on ${m.id}`).toBeLessThan(L);
        else expect(M, `${c.name} mark on ${m.id}`).toBeGreaterThan(L);
      }
    }
  });

  it("tells each colour from the next, and steps the lightness where a colour-blind reader would confuse two", () => {
    for (const m of MODES.filter((x) => x.id === "default" || x.id === "parchment")) {
      const washes = HIGHLIGHT_COLORS.map((c) => ({ c, rgb: over(theme(c, m).wash, m.ground) }));
      for (let i = 0; i < washes.length; i++)
        for (let j = i + 1; j < washes.length; j++) {
          const d = deltaE(washes[i].rgb, washes[j].rgb);
          expect(d, `${washes[i].c.name}/${washes[j].c.name} on ${m.id}: ${d.toFixed(1)}`).toBeGreaterThanOrEqual(4.5);
        }
      // The pairs a red-green colour-blind reader sees as one hue differ in
      // lightness instead: red and green, violet and blue, rose and teal, and
      // yellow beside both red and green.
      const L = (name: string) => oklab(washes.find((w) => w.c.name === name)!.rgb)[0];
      for (const [a, b] of [
        ["red", "green"],
        ["violet", "blue"],
        ["rose", "teal"],
        ["yellow", "red"],
        ["yellow", "green"],
      ]) {
        expect(Math.abs(L(a) - L(b)), `${a}/${b} lightness on ${m.id}`).toBeGreaterThanOrEqual(0.03);
      }
    }
  });

  it("draws a disc that stands on its ground, with a check that stands on the disc", () => {
    for (const m of MODES) {
      for (const c of HIGHLIGHT_COLORS) {
        const swatch = parse(theme(c, m).swatch).rgb;
        // Non-text contrast (WCAG 1.4.11): the disc on the card the picker
        // sits on, and the check, drawn in the page's colour, on the disc.
        const pill = over(`rgba(${m.ground.join(", ")}, 0.95)`, m.ground);
        expect(contrast(swatch, pill), `${c.name} disc on ${m.id}`).toBeGreaterThanOrEqual(3);
        expect(contrast(m.ground, swatch), `${c.name} check on ${m.id}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe("the colours on an element", () => {
  it("carry both themes, for the stylesheet to choose between", () => {
    for (const c of HIGHLIGHT_COLORS) {
      expect(highlightVars(c.id)).toEqual({
        "--hl-verse-d": c.dark.wash,
        "--hl-verse-l": c.light.wash,
        "--hl-word-d": c.dark.mark,
        "--hl-word-l": c.light.mark,
        "--hl-swatch-d": c.dark.swatch,
        "--hl-swatch-l": c.light.swatch,
      });
    }
    expect(highlightVars("nonsense")).toEqual(highlightVars(DEFAULT_HIGHLIGHT_COLOR));
  });

  it("are chosen by the reading mode in app/globals.css, and a highlighted verse wears no box", () => {
    const dark = tokens("[data-hl-color]");
    expect(dark).toEqual({ "--hl-verse": "var(--hl-verse-d)", "--hl-word": "var(--hl-word-d)", "--hl-swatch": "var(--hl-swatch-d)" });
    const light = tokens('html[data-reading-mode="parchment"] [data-hl-color]:not(.dark-island *)');
    expect(light).toEqual({ "--hl-verse": "var(--hl-verse-l)", "--hl-word": "var(--hl-word-l)", "--hl-swatch": "var(--hl-swatch-l)" });
    // The white box at 10% over a highlighted verse's whole row, until 1.7.1.
    expect(CSS).not.toMatch(/\[data-hl="true"\]/);
  });
});

describe("what each colour is called", () => {
  const dir = path.join(ROOT, "lib/i18n/messages");
  const catalogs = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

  it("is in all 21 languages", () => {
    expect(catalogs).toHaveLength(21);
    for (const f of catalogs) {
      const messages = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as Record<string, string>;
      for (const c of HIGHLIGHT_COLORS) {
        const name = messages[colorNameKey(c.id)];
        expect(typeof name === "string" && name.trim().length > 0, `${f}: ${colorNameKey(c.id)}`).toBe(true);
      }
      // Six colours, six names: no two alike in one language.
      const names = HIGHLIGHT_COLORS.map((c) => messages[colorNameKey(c.id)].toLocaleLowerCase());
      expect(new Set(names).size, f).toBe(names.length);
    }
  });
});
