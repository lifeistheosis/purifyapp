// A source-reading guard, in the idiom of lib/ui/__tests__/touchTargets.test.ts
// and lib/saints/__tests__/iconRights.test.ts.
//
// app/admin/admin-theme.css carries two palettes now, and its comments make
// contrast claims ("all three clear 5:1 on every surface above, verified").
// Until this file existed, "verified" meant someone did the arithmetic once by
// hand and wrote it down. Nothing re-ran it, so the next nudge to a token
// could quietly break the claim and nobody would know.
//
// This parses the stylesheet and does the arithmetic. It is the only automated
// check the theme can have: vitest here is a node environment with no DOM and
// no layout, so nothing can measure a rendered pixel.
//
// What it cannot do: judge whether two adjacent SERIES colours stay apart under
// deuteranopia. That needs a CVD simulation this repo does not have, which is
// exactly why the light palette's comment refuses to claim the dark set's
// "worst adjacent deutan dE 9.0" figure.

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
// itself at length, and prose about things like hover:bg-white/[0.03] or a
// nested selector will happily contain a brace that ends the block early and
// silently drops half the palette from this check.
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

const darkTokens = block(".adm {");
const lightTokens = { ...darkTokens, ...block(':root[data-adm-theme="light"] .adm {') };

function color(tokens: Record<string, string>, name: string): Rgb {
  const raw = tokens[name];
  if (raw === undefined) throw new Error(`missing token ${name}`);
  const parsed = parseColor(raw);
  if (!parsed) throw new Error(`token ${name} is not a plain colour: ${raw}`);
  return parsed;
}

const THEMES: [string, Record<string, string>][] = [
  ["dark", darkTokens],
  ["light", lightTokens],
];

// WCAG 1.4.3 for text, 1.4.11 for graphical objects.
const TEXT_MIN = 4.5;
const GRAPHIC_MIN = 3;

const SURFACES = ["--adm-bg", "--adm-panel", "--adm-panel-2", "--adm-rail"];
const INKS = ["--adm-ink", "--adm-ink-2", "--adm-ink-3"];

describe("admin theme contrast", () => {
  it("defines both palettes", () => {
    expect(Object.keys(darkTokens).length).toBeGreaterThan(20);
    // The light block forks colour only. If it ever redefines structure, the
    // "one structure, two palettes" split has quietly broken.
    const lightOnly = block(':root[data-adm-theme="light"] .adm {');
    for (const structural of [
      "--adm-radius",
      "--adm-radius-sm",
      "--adm-radius-lg",
      "--adm-radius-pill",
      "--adm-ease",
    ]) {
      expect(lightOnly[structural]).toBeUndefined();
    }
  });

  for (const [theme, tokens] of THEMES) {
    describe(theme, () => {
      it("every ink clears 4.5:1 on every surface", () => {
        for (const ink of INKS) {
          for (const surface of SURFACES) {
            const ratio = contrast(color(tokens, ink), color(tokens, surface));
            expect(
              Number(ratio.toFixed(2)),
              `${theme}: ${ink} on ${surface}`,
            ).toBeGreaterThanOrEqual(TEXT_MIN);
          }
        }
      });

      it("ink on the accent, and on the nav and badge pairs, clears 4.5:1", () => {
        const pairs: [string, string][] = [
          ["--adm-on-accent", "--adm-accent"],
          ["--adm-nav-active-fg", "--adm-nav-active-bg"],
        ];
        for (const [fg, bg] of pairs) {
          const ratio = contrast(color(tokens, fg), color(tokens, bg));
          expect(
            Number(ratio.toFixed(2)),
            `${theme}: ${fg} on ${bg}`,
          ).toBeGreaterThanOrEqual(TEXT_MIN);
        }

        // The badge wash is translucent on dark, so it has to be flattened
        // onto the rail it actually sits on before the ratio means anything.
        const badgeBg = color(tokens, "--adm-badge-bg");
        const flattened = badgeBg.a < 1 ? over(badgeBg, color(tokens, "--adm-rail")) : badgeBg;
        const badgeRatio = contrast(color(tokens, "--adm-badge-fg"), flattened);
        expect(
          Number(badgeRatio.toFixed(2)),
          `${theme}: --adm-badge-fg on --adm-badge-bg over the rail`,
        ).toBeGreaterThanOrEqual(TEXT_MIN);
      });

      it("every categorical series clears 3:1 on the card surface", () => {
        for (const n of [1, 2, 3, 4, 5, 6]) {
          const ratio = contrast(color(tokens, `--adm-s${n}`), color(tokens, "--adm-panel"));
          expect(
            Number(ratio.toFixed(2)),
            `${theme}: --adm-s${n} on --adm-panel`,
          ).toBeGreaterThanOrEqual(GRAPHIC_MIN);
        }
      });
    });
  }
});
