// The reading-mode chips draw a small page swatch for each palette, copied by
// hand from app/globals.css (a "use client" file cannot read the stylesheet).
// In 1.9 Candlelight's ground moved from #0a0a0a to #050505 and its chip kept
// the old page until this test was written, so this holds every chip to its
// palette's own --color-night: Dark to the @theme block, the rest to their
// html[data-reading-mode] blocks.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");

// Comments out first: a hex in the prose is not a rule.
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const CHIPS = read("components/reader/ReadingModeChips.tsx");

/** The ground a palette sets, from every block of its selector. */
function groundOf(mode: string): string | undefined {
  const src =
    mode === "default"
      ? (/@theme \{([\s\S]*?)\n\}/.exec(CSS)?.[1] ?? "")
      : [...CSS.matchAll(new RegExp(`html\\[data-reading-mode="${mode}"\\] \\{([^}]*)\\}`, "g"))].map((m) => m[1]).join("\n");
  return /--color-night:\s*(#[0-9a-f]{6})/i.exec(src)?.[1]?.toLowerCase();
}

describe("the reading-mode chips' swatches", () => {
  const swatches = [...CHIPS.matchAll(/^\s+(\w+): \{ page: "(#[0-9a-fA-F]{6})"/gm)].map((m) => [m[1], m[2].toLowerCase()] as const);

  it("are all read (Dark, Candlelight, Monastery, Parchment, True black and the two collections)", () => {
    expect(swatches.map(([mode]) => mode)).toEqual(["default", "candlelight", "monastery", "parchment", "black", "councils", "cappadocian"]);
  });

  it("each wear its palette's own ground, as app/globals.css sets it", () => {
    for (const [mode, page] of swatches) expect(groundOf(mode), mode).toBe(page);
  });
});
