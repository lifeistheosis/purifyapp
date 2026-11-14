import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Today's date line at 1032 (Gate 2, fault 6, 2026-11-14): "Saturday,
 * November 14 · Feast" read 2.67:1 on the pixels under it, on all seven
 * palettes. The lead's sky (/themes/nightsky-stars.svg) is drawn to the
 * card's width, so a wide screen sets its stars larger: at 1032 one stood
 * under "Feast", and on a star's core no share of the paper reaches 4.5:1.
 * Round 1's look is kept; the lead's small lines take the house's close halo
 * (.words-halo) in the lead's own night, so only a star behind a letter dims.
 *
 * What it cannot see: the pixels. checkMock { pixels: true } measures them on
 * the export, at 390, 800 and 1032.
 *
 * What a reader would notice if this broke: on a tablet or a computer, the
 * date at the top of Today hard to read where a star stands behind it.
 */

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const LEAD = read("components/today/GreetingHeader.tsx");

/** The body of the one rule whose selector is exactly this. */
function rule(selector: string): string {
  const found = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter((m) => m[1].trim() === selector);
  expect(found, `one rule for ${selector}`).toHaveLength(1);
  return found[0][2];
}

describe("Today's lead: its small lines hold on the sky at every width", () => {
  it("the lead's night is the colour the halo is drawn in", () => {
    expect(rule(".day-lead")).toMatch(/--color-night: #05070d;/);
  });

  it("its faint lines wear the house's close halo, in the lead's own night", () => {
    const body = rule(".day-lead :is(.text-paper\\/65, .text-paper\\/75)");
    const shadow = /text-shadow:\s*([^;]+);/.exec(body)?.[1].replace(/\s+/g, " ").trim() ?? "";
    const layers = shadow.split(/,\s*(?![^(]*\))/);
    // The house's halo, layer for layer (.words-halo): centred on the letters, never thrown one way,
    // and inside a line's own leading.
    expect(layers.map((l) => /^0 0 (\d+)px /.exec(l)?.[1])).toEqual(["1", "3", "6"]);
    // #05070d, the lead's own night, at the house's shares: plain, since the lead is that night on every
    // palette, so a WebView without color-mix draws the same.
    expect(layers.map((l) => /rgb\(5 7 13 \/ ([\d.]+)\)$/.exec(l)?.[1])).toEqual(["0.95", "0.9", "0.8"]);
  });

  it("the date line and every other faint line in the lead wear an ink the halo reaches", () => {
    // The date line is the lead's first line of words.
    const date = /<p className="([^"]+)">\{waiting \? "[^"]*" : line\}<\/p>/.exec(LEAD)?.[1] ?? "";
    expect(date.split(" ")).toContain("text-paper/65");
    // No faint ink in the lead outside the two the rule names: a new share would stand on the sky bare.
    const faint = [...LEAD.matchAll(/\btext-paper\/(\d+)\b/g)].map((m) => m[1]);
    expect(faint.length).toBeGreaterThanOrEqual(7);
    expect([...new Set(faint)].sort()).toEqual(["65", "75"]);
  });
});
