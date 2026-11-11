// The reader's Reading mode section copies no colour by hand.
//
// It did. Until build 93 note 4 it was a grid of chips, each with a small
// swatch of its palette's page and ink copied from app/globals.css (a "use
// client" file cannot read the stylesheet). In 1.9 Candlelight's ground moved
// from #0a0a0a to #050505 and its chip kept the old page until this test was
// written, holding every swatch to its palette's own --color-night.
//
// The chips are now a shelf of small pages
// (components/reader/ReadingModeChips.tsx), the ones Settings draws, and a
// small page takes its ground and ink from the stylesheet itself: the
// .set-mode-page[data-palette] rules, which
// lib/settings/__tests__/litPanels.test.ts holds to each palette's tokens. So
// what is held here is that no colour is written into the section again, and
// that each palette on the shelf has its page in the stylesheet.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { READING_THEMES } from "@/lib/reader/readingModes";

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../../..", rel), "utf8");

// Comments out first: a hex in the prose is not a rule.
const CSS = read("app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
const SHELF = read("components/reader/ReadingModeChips.tsx");
const CODE = SHELF.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");

describe("the reader's Reading mode section", () => {
  it("writes no colour of its own: no hex, no rgb, no inline style", () => {
    expect(CODE).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(CODE).not.toMatch(/\brgba?\(/);
    expect(CODE).not.toContain("style={");
    expect(CODE).not.toContain("THEME_SWATCHES");
  });

  it("draws each palette as the small page Settings draws", () => {
    expect(CODE).toContain('import { GoalTile, ModeTile } from "@/components/settings/ReadingModePages";');
    expect(CODE).toContain("<ModeTile");
    expect(CODE).toContain("<GoalTile");
  });

  it("every palette that can stand on the shelf has its page in the stylesheet, on its own ground", () => {
    // Dark is the page's own default; every other palette, and every look, sets its ground.
    const base = /\.set-mode-page \{([^}]*)\}/.exec(CSS)?.[1] ?? "";
    expect(/--mp-ground:\s*(#[0-9a-f]{6})/i.exec(base)?.[1].toLowerCase()).toBe("#101013");
    for (const { id } of READING_THEMES) {
      if (id === "default") continue;
      const block = [...CSS.matchAll(new RegExp(`\\.set-mode-page\\[data-palette="${id}"\\] \\{([^}]*)\\}`, "g"))].map((m) => m[1]).join("\n");
      expect(block, id).toMatch(/--mp-ground:\s*#[0-9a-f]{6}/i);
    }
  });
});
