import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The gate's confirm run (Admin, 2026-11-12, 05:40 to 09:27 UTC, export
 * 872724aa3) and Admin's sweep of the pages the walks never reach: the fails
 * that fell to Updates 2 (the arbiter's 09:31 UTC), each held here so the next
 * edit cannot put it back before a walk is run. Each case fails on the code
 * that run walked.
 */

const ROOT = process.cwd();
const CSS = fs.readFileSync(path.join(ROOT, "app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

type Rgb = [number, number, number];
/** A palette's or a look's own token, as its block in globals.css writes it. */
function token(selector: string, name: string): Rgb | null {
  for (const m of CSS.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if ((m[1].split(";").pop() ?? "").trim() !== selector) continue;
    const hex = new RegExp(`--color-${name}\\s*:\\s*#([0-9a-f]{6})\\b`, "i").exec(m[2])?.[1];
    if (hex) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
  }
  return null;
}
const lin = (c: number) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const lum = ([r, g, b]: Rgb) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
/** Words at `share` of the ink over a ground, as the pixel walk measures them. */
function onGround(ink: Rgb, share: number, ground: Rgb): number {
  const shown = ink.map((v, i) => v * share + ground[i] * (1 - share)) as Rgb;
  const [a, b] = [lum(shown), lum(ground)].sort((p, q) => q - p);
  return (a + 0.05) / (b + 0.05);
}

const LIGHT = 'html[data-reading-mode="parchment"]';
/** Light and the ten looks worn over it, each with its own ink and ground where it sets them. */
const LIGHT_PALETTES: [string, string][] = [
  ["Light", LIGHT],
  ...["desert", "jordan", "patmos", "blush", "rose", "lavender", "olive", "stone", "linen"].map((look): [string, string] => [look, `html[data-look="${look}"]`]),
];

describe("a chant's words switch (fail 9, Psalm 117)", () => {
  it("draws the parts not chosen 4.5:1 or more on Light and on every light look", () => {
    // The base share (55), and the share the light palettes give the parts not chosen, if any.
    const base = Number(/\.words-view > button \{[^}]*color: color-mix\(in srgb, var\(--color-paper\) (\d+)%/.exec(CSS)?.[1]);
    const lifted = /html\[data-reading-mode="parchment"\] \.words-view > button\[aria-checked="false"\] \{\s*color: color-mix\(in srgb, var\(--color-paper\) (\d+)%/.exec(CSS)?.[1];
    expect(base).toBe(55);
    const share = Number(lifted ?? base) / 100;
    for (const [name, selector] of LIGHT_PALETTES) {
      const paper = token(selector, "paper") ?? token(LIGHT, "paper");
      const ground = token(selector, "night") ?? token(LIGHT, "night");
      expect(paper && ground, name).toBeTruthy();
      // The switch stands on the page's own ground: this sum read 3.40:1 on Light at 55, as the walk did (3.39).
      expect(onGround(paper!, share, ground!), `${name}, at ${share * 100} percent`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

