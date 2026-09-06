// A source-reading guard, in the idiom of lib/ui/__tests__/touchTargets.test.ts
// and lib/saints/__tests__/iconRights.test.ts.
//
// app/admin/admin-theme.css makes contrast claims in its comments ("5.14:1
// on white, 4.72:1 on the cream"). Until this file existed, "verified" meant
// someone did the arithmetic once by hand and wrote it down. This parses the
// stylesheet and does the arithmetic on every run, so the next nudge to a
// token cannot quietly break the claim.
//
// ONE PALETTE. The Ledger pass removed the dark block and the light fork,
// so this reads a single token block on [data-surface="admin"] and asserts
// that the old fork is gone: no :root[data-adm-theme] selector, and
// color-scheme forced to light so an OS dark mode cannot pull the reader's
// tokens in through a native control.
//
// What it cannot do: judge a rendered pixel. vitest here is a node
// environment with no DOM and no layout.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CSS = readFileSync(
  join(process.cwd(), "app", "admin", "admin-theme.css"),
  "utf8",
);

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

// Comments are stripped before any brace matching. The stylesheet explains
// itself at length, and prose will happily contain a brace that ends the
// block early and silently drops half the palette from this check.
const BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** Pull the declarations out of one rule block, found by its selector text. */
function block(selector: string): Record<string, string> {
  const at = BARE.indexOf(selector);
  if (at === -1) throw new Error(`selector not found in admin-theme.css: ${selector}`);
  const open = BARE.indexOf("{", at);
  const close = BARE.indexOf("}", open);
  const body = BARE.slice(open + 1, close);

  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

const ROOT = '[data-surface="admin"]';
const tokens = block(ROOT);

/** Resolve one level of var() so an alias like --adm-good can be checked. */
function color(name: string): Rgb {
  let raw = tokens[name];
  if (raw === undefined) throw new Error(`missing token ${name}`);
  const alias = /^var\((--[a-z0-9-]+)\)$/i.exec(raw);
  if (alias) raw = tokens[alias[1]] ?? raw;
  const parsed = parseColor(raw);
  if (!parsed) throw new Error(`token ${name} is not a plain colour: ${raw}`);
  return parsed;
}

// WCAG 1.4.3 for text, 1.4.11 for graphical objects.
const TEXT_MIN = 4.5;
const GRAPHIC_MIN = 3;

const SURFACES = ["--adm-bg", "--adm-panel", "--adm-panel-2", "--adm-rail", "--adm-canvas", "--adm-card"];
const INKS = ["--adm-ink", "--adm-ink-2", "--adm-ink-3"];

describe("admin theme, one light palette", () => {
  it("defines the Ledger tokens on the admin root", () => {
    expect(Object.keys(tokens).length).toBeGreaterThan(30);
    for (const name of [
      "--adm-canvas",
      "--adm-card",
      "--adm-line",
      "--adm-ink",
      "--adm-ink-2",
      "--adm-ink-3",
      "--adm-up",
      "--adm-down",
      "--adm-chart-line",
      "--adm-count-ms",
      "--adm-draw-ms",
      "--adm-radius",
      "--adm-radius-sm",
    ]) {
      expect(tokens[name], name).toBeDefined();
    }
  });

  it("carries the spec's fixed colours", () => {
    expect(tokens["--adm-canvas"].toLowerCase()).toBe("#f7f5f1");
    expect(tokens["--adm-card"].toLowerCase()).toBe("#ffffff");
    expect(tokens["--adm-line"].toLowerCase()).toBe("#e6e2da");
    expect(tokens["--adm-ink"].toLowerCase()).toBe("#1b1a17");
    expect(tokens["--adm-ink-2"].toLowerCase()).toBe("#6b675f");
    expect(tokens["--adm-up"].toLowerCase()).toBe("#8a6a1c");
    expect(tokens["--adm-down"].toLowerCase()).toBe("#a63d2f");
    // The accent IS the gold; the two names must never drift apart.
    expect(tokens["--adm-accent"].toLowerCase()).toBe(tokens["--adm-up"].toLowerCase());
    expect(tokens["--adm-critical"].toLowerCase()).toBe(tokens["--adm-down"].toLowerCase());
  });

  it("has no dark fork and forces color-scheme light", () => {
    expect(BARE).not.toContain("data-adm-theme");
    expect(BARE).not.toMatch(/color-scheme\s*:\s*dark/);
    // The declaration has to be inside the root block, not merely somewhere.
    const at = BARE.indexOf(ROOT);
    const open = BARE.indexOf("{", at);
    const close = BARE.indexOf("}", open);
    expect(BARE.slice(open, close)).toMatch(/color-scheme\s*:\s*light/);
  });

  it("retires --adm-good to an alias of --adm-up", () => {
    expect(tokens["--adm-good"]).toBe("var(--adm-up)");
  });

  it("sets both shadow tokens to none", () => {
    expect(tokens["--adm-shadow-card"]).toBe("none");
    expect(tokens["--adm-shadow-pop"]).toBe("none");
  });

  it("every ink clears 4.5:1 on every surface", () => {
    for (const ink of INKS) {
      for (const surface of SURFACES) {
        const ratio = contrast(color(ink), color(surface));
        expect(Number(ratio.toFixed(2)), `${ink} on ${surface}`).toBeGreaterThanOrEqual(TEXT_MIN);
      }
    }
  });

  it("the two accents are readable as text on every surface", () => {
    for (const accent of ["--adm-up", "--adm-down", "--adm-warn", "--adm-serious", "--adm-critical", "--adm-good"]) {
      for (const surface of SURFACES) {
        const ratio = contrast(color(accent), color(surface));
        expect(Number(ratio.toFixed(2)), `${accent} on ${surface}`).toBeGreaterThanOrEqual(TEXT_MIN);
      }
    }
  });

  it("ink on the accent, and the nav and badge pairs, clear 4.5:1", () => {
    const pairs: [string, string][] = [
      ["--adm-on-accent", "--adm-accent"],
      ["--adm-nav-active-fg", "--adm-nav-active-bg"],
      ["--adm-nav-active-fg", "--adm-rail"],
    ];
    for (const [fg, bg] of pairs) {
      const ratio = contrast(color(fg), color(bg));
      expect(Number(ratio.toFixed(2)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(TEXT_MIN);
    }

    const badgeBg = color("--adm-badge-bg");
    const flattened = badgeBg.a < 1 ? over(badgeBg, color("--adm-rail")) : badgeBg;
    const badgeRatio = contrast(color("--adm-badge-fg"), flattened);
    expect(Number(badgeRatio.toFixed(2)), "--adm-badge-fg on --adm-badge-bg").toBeGreaterThanOrEqual(TEXT_MIN);
  });

  it("every series slot clears 3:1 on the card surface", () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const ratio = contrast(color(`--adm-s${n}`), color("--adm-panel"));
      expect(Number(ratio.toFixed(2)), `--adm-s${n} on --adm-panel`).toBeGreaterThanOrEqual(GRAPHIC_MIN);
    }
  });

  it("the chart line and the hairline are the spec's weights", () => {
    expect(tokens["--adm-chart-line"]).toBe("1.25px");
    expect(tokens["--adm-line-w"]).toBe("1px");
    expect(tokens["--adm-count-ms"]).toBe("400ms");
    expect(tokens["--adm-draw-ms"]).toBe("500ms");
  });
});
