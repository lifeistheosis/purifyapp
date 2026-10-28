// Premium is silver and white (1.8). The owner, 2026-10-28: "stop using that
// yellow too as that contrast color just use a glowly white. that yellow is
// vibe coded." The four Premium tokens kept their names, so every surface
// that wore the gold (a badge, a selected choice, a Plus mark, the profile
// badges) turned at once; this holds them there on every palette, with the
// Parchment accent that was a dark gold, and the glow on the Premium pill.
//
// What a reader would notice if this broke: a yellow or brown mark anywhere
// a Premium colour is used, or a grey on paper too faint to read.
//
// It reads app/globals.css, in the idiom of lib/reader/__tests__/trueBlack.test.ts.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const CSS = fs.readFileSync(path.resolve(__dirname, "../../../app/globals.css"), "utf8");
const BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** The custom properties of every rule whose selector is exactly `selector`, later ones winning. */
function tokens(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of BARE.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if ((m[1].split(";").pop() ?? "").trim() !== selector) continue;
    for (const d of m[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) out[d[1]] = d[2].trim();
  }
  return out;
}

type Rgb = [number, number, number];
function rgb(raw: string | undefined): Rgb {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(raw ?? "");
  if (!m) throw new Error(`not a six-digit hex: ${raw}`);
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
function luminance([r, g, b]: Rgb): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}
function contrast(a: Rgb, b: Rgb): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** A grey: the three channels within `spread` of each other, and never warm (red or green above blue). */
function isGrey([r, g, b]: Rgb, spread: number): boolean {
  return Math.max(r, g, b) - Math.min(r, g, b) <= spread && r <= b && g <= b;
}

const PREMIUM = ["--color-premium", "--color-premium-ink", "--color-premium-bright", "--color-premium-soft"];
const ACCENT = ["--color-gold", "--color-gold-soft", "--color-gold-pale"];
const PARCHMENT = 'html[data-reading-mode="parchment"]';

describe("the Premium tokens", () => {
  const dark = tokens("@theme");

  it("are silver and white on the dark palettes, the brightest pure white", () => {
    for (const name of PREMIUM) expect(isGrey(rgb(dark[name]), 4), `${name}: ${dark[name]}`).toBe(true);
    expect(dark["--color-premium-bright"]).toBe("#ffffff");
    // No dark palette sets them again, so they are Dark's on all of them.
    for (const id of ["candlelight", "monastery", "black"]) {
      const own = tokens(`html[data-reading-mode="${id}"]`);
      for (const name of PREMIUM) expect(own[name], `${id} sets ${name}`).toBeUndefined();
    }
  });

  it("read on every dark ground", () => {
    for (const id of ["@theme", 'html[data-reading-mode="candlelight"]', 'html[data-reading-mode="monastery"]', 'html[data-reading-mode="black"]']) {
      const ground = rgb(tokens(id)["--color-night"]);
      for (const name of PREMIUM) expect(contrast(rgb(dark[name]), ground), `${name} on ${id}`).toBeGreaterThanOrEqual(7);
    }
  });

  it("are ink greys on Parchment, never brown or yellow, and read on its page and its cards", () => {
    const paper = tokens(PARCHMENT);
    const page = rgb(paper["--color-night"]);
    const card = rgb(paper["--color-night-soft"]);
    for (const name of [...PREMIUM, ...ACCENT]) {
      const ink = rgb(paper[name]);
      expect(isGrey(ink, 6), `${name}: ${paper[name]}`).toBe(true);
      expect(contrast(ink, page), `${name} on the page`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(ink, card), `${name} on a card`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("are put back to Dark's inside a dark island on Parchment", () => {
    const island = tokens(`${PARCHMENT} .dark-island`);
    for (const name of PREMIUM) expect(island[name], name).toBe(tokens("@theme")[name]);
  });

  it("carry none of the gold they were", () => {
    const tokenLines = BARE.match(/--color-(?:premium|gold)[a-z-]*\s*:\s*[^;]+;/g) ?? [];
    expect(tokenLines.length).toBeGreaterThan(10);
    for (const line of tokenLines) {
      expect(line).not.toMatch(/#c9a25a|#e2c68b|#efd9a3|#d6b877|#7d5f18|#6b4f12|#5a420e|#6f5314|#7c621d|#6b5316|#5d4a1a/i);
    }
  });
});

describe("the Premium pill's glow", () => {
  const rule = (selector: string) =>
    new RegExp(`(^|\\})\\s*${selector.replace(/[.[\]()*+?^$|\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(BARE)?.[2] ?? "";

  it("is white and still: a light on the word and a halo of its own, nothing that moves", () => {
    expect(rule(".premium-pill")).toMatch(/text-shadow:\s*0 0 10px rgba\(255, 255, 255, 0\.35\);/);
    const halo = rule(".premium-pill::after");
    expect(halo).toMatch(/box-shadow:\s*0 0 14px -2px rgba\(255, 255, 255, 0\.3\);/);
    expect(halo).toMatch(/z-index:\s*-1;/);
    expect(`${rule(".premium-pill")}${halo}`).not.toMatch(/animation|transition/);
  });

  it("gives Parchment plain ink and a shade, since white cannot glow on paper", () => {
    expect(rule(`${PARCHMENT} .premium-pill`)).toMatch(/text-shadow:\s*none;/);
    expect(rule(`${PARCHMENT} .premium-pill::after`)).toMatch(/box-shadow:\s*0 1px 3px rgb\(0 0 0 \/ 0\.1\);/);
  });
});
