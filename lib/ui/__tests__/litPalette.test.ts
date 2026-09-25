// A source-reading guard, in the idiom of lib/admin/__tests__/adminTheme.test.ts.
//
// The liturgical-surface tokens in app/globals.css (the `.lit-surface` blocks)
// were solved against WCAG once per app palette, because AppThemeController
// applies the reader's palette to every screen and Parchment, the light one,
// is free. The stylesheet's comment claims every pair clears 1.4.3 or 1.4.11
// in all four palettes. This parses the stylesheet and does the arithmetic,
// so the next nudge to a token cannot quietly break that claim: vitest here
// is a node environment with no DOM, and nothing else can check a colour.
//
// Spec: docs/design/family-matrix-and-catechumen-corner.md, section 1.2 and
// Appendix A.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

type Rgb = { r: number; g: number; b: number; a: number };

/** #rgb, #rrggbb, rgb(r g b), rgb(r g b / a). Anything else is not a colour. */
function parseColor(raw: string): Rgb | null {
  const v = raw.trim();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const h = hex[1];
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }

  const fn = /^rgba?\(([^)]+)\)$/i.exec(v);
  if (fn) {
    const [rgbPart, alphaPart] = fn[1].split("/");
    const n = rgbPart.trim().split(/[\s,]+/).map(Number);
    if (n.length < 3 || n.some(Number.isNaN)) return null;
    const a = alphaPart === undefined ? 1 : Number(alphaPart.trim());
    return { r: n[0], g: n[1], b: n[2], a: Number.isNaN(a) ? 1 : a };
  }

  return null;
}

/** Flatten a translucent colour onto an opaque one, as the compositor would. */
function over(fg: Rgb, bg: Rgb): Rgb {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

function withAlpha(c: Rgb, a: number): Rgb {
  return { ...c, a };
}

function luminance(c: Rgb): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

function contrast(fg: Rgb, bg: Rgb): number {
  const f = fg.a < 1 ? over(fg, bg) : fg;
  const l1 = luminance(f);
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Comments are stripped before any brace matching: this stylesheet explains
// itself at length, and a brace in the prose would end a block early.
const BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * The custom properties of every rule whose selector is EXACTLY `selector`,
 * merged in source order. Exact, not a substring: `.lit-surface` must not
 * pick up `html[data-reading-mode="parchment"] .lit-surface`. Merged, because
 * a palette may be declared in more than one block (Candlelight's recessed
 * well is a second block of its own).
 */
function rules(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  let found = false;
  for (const m of BARE.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const sel = (m[1].split(";").pop() ?? "").trim();
    if (sel !== selector) continue;
    found = true;
    for (const d of m[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      out[d[1]] = d[2].trim();
    }
  }
  if (!found) throw new Error(`selector not found in app/globals.css: ${selector}`);
  return out;
}

function color(tokens: Record<string, string>, name: string): Rgb {
  const raw = tokens[name];
  if (raw === undefined) throw new Error(`missing token ${name}`);
  const parsed = parseColor(raw);
  // Also the iOS 15 guard: a var() or a color-mix() here fails to parse.
  if (!parsed) throw new Error(`token ${name} is not a plain colour: ${raw}`);
  return parsed;
}

const THEME = rules("@theme");
const BASE_LIT = rules(".lit-surface");

type Palette = { page: Rgb; card: Rgb; paper: Rgb; lit: Record<string, string> };

function palette(id: "default" | "candlelight" | "monastery" | "parchment"): Palette {
  if (id === "default") {
    return {
      page: color(THEME, "--color-night"),
      card: color(THEME, "--color-night-soft"),
      // Alabaster, remapped for the Default palette only.
      paper: color(rules("html:not([data-reading-mode]) .lit-surface"), "--color-paper"),
      lit: BASE_LIT,
    };
  }
  const mode = rules(`html[data-reading-mode="${id}"]`);
  return {
    page: color(mode, "--color-night"),
    card: color(mode, "--color-night-soft"),
    paper: color(mode, "--color-paper"),
    lit: { ...BASE_LIT, ...rules(`html[data-reading-mode="${id}"] .lit-surface`) },
  };
}

const PALETTES = ["default", "candlelight", "monastery", "parchment"] as const;

// WCAG 1.4.3 for text (and 1.4.6 for the headline pairs), 1.4.11 for
// graphical objects.
const TEXT_MIN = 4.5;
const AAA_MIN = 7;
const GRAPHIC_MIN = 3;

// The fast banner's span sits on the container at this alpha (spec 1.2).
const SPAN_ALPHA = 0.8;

type Pair = [label: string, fg: Rgb, bg: Rgb, min: number];

function pairs(p: Palette): Pair[] {
  const t = (name: string) => color(p.lit, name);
  const glowPeak = over(t("--lit-feast-glow"), p.card);
  return [
    ["feast title on a card", t("--lit-feast"), p.card, TEXT_MIN],
    ["feast title at the glow's brightest point", t("--lit-feast"), glowPeak, TEXT_MIN],
    ["feast hairline on a card", t("--lit-feast-border"), p.card, GRAPHIC_MIN],
    ["feast mode rule on the page", t("--lit-feast"), p.page, GRAPHIC_MIN],
    ["fast accent text on a card", t("--lit-fast-accent"), p.card, TEXT_MIN],
    ["fast accent text on the page", t("--lit-fast-accent"), p.page, TEXT_MIN],
    ["fast hairline on a card", t("--lit-fast-border"), p.card, GRAPHIC_MIN],
    ["title on the fast container", t("--lit-on-fast"), t("--lit-fast"), AAA_MIN],
    ["span on the fast container", withAlpha(t("--lit-on-fast"), SPAN_ALPHA), t("--lit-fast"), TEXT_MIN],
    ["primary text on a card", p.paper, p.card, AAA_MIN],
    ["primary text on the page", p.paper, p.page, AAA_MIN],
    ["muted text on a card", t("--lit-muted"), p.card, TEXT_MIN],
    ["muted text on the page", t("--lit-muted"), p.page, TEXT_MIN],
    ["neutral line on a card", t("--lit-line"), p.card, GRAPHIC_MIN],
    ["neutral line on the page", t("--lit-line"), p.page, GRAPHIC_MIN],
    ["check glyph (page colour) on the completed disc", p.page, t("--lit-feast"), TEXT_MIN],
    ["completed disc against a card", t("--lit-feast"), p.card, GRAPHIC_MIN],
    ["primary button label on its fill", p.page, p.paper, AAA_MIN],
  ];
}

describe("liturgical surface palette", () => {
  it("defines every token on the base block", () => {
    for (const name of [
      "--lit-feast",
      "--lit-feast-glow",
      "--lit-feast-border",
      "--lit-fast",
      "--lit-on-fast",
      "--lit-fast-accent",
      "--lit-fast-border",
      "--lit-muted",
      "--lit-line",
    ]) {
      expect(() => color(BASE_LIT, name), name).not.toThrow();
    }
  });

  it("resolves the mode accent to the intended token for each mode", () => {
    // The one variable that changes with the mode (spec 1.2). Ordinary is the
    // base block's default; feast and fast override it.
    expect(BASE_LIT["--mode-accent"]).toBe("var(--lit-line)");
    expect(rules('.lit-surface[data-mode="feast"]')["--mode-accent"]).toBe("var(--lit-feast)");
    expect(rules('.lit-surface[data-mode="fast"]')["--mode-accent"]).toBe("var(--lit-fast-accent)");
  });

  it("remaps paper to Alabaster on the Default palette only", () => {
    expect(rules("html:not([data-reading-mode]) .lit-surface")["--color-paper"]).toBe("#f9f6f0");
    for (const id of ["candlelight", "monastery", "parchment"] as const) {
      expect(
        rules(`html[data-reading-mode="${id}"] .lit-surface`)["--color-paper"],
        `${id} keeps its own ink`,
      ).toBeUndefined();
    }
  });

  for (const id of PALETTES) {
    describe(id, () => {
      it("clears its WCAG threshold on every pair", () => {
        for (const [label, fg, bg, min] of pairs(palette(id))) {
          expect(Number(contrast(fg, bg).toFixed(2)), `${id}: ${label}`).toBeGreaterThanOrEqual(min);
        }
      });
    });
  }
});
