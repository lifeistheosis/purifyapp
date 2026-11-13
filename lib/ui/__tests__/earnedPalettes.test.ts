import { describe, expect, it } from "vitest";

import { READING_THEMES } from "@/lib/reader/readingModes";

import { EARNED, EVERY, LOOKS, PALETTES, WORN, paletteGaps } from "../../../scripts/mock-check.mjs";

/**
 * The two palettes earned by reading are measured (2026-11-13, routed by the
 * arbiter; found by Updates 9). Councils and Cappadocian, the registry's
 * collection palettes (lib/reader/earned.ts), stood in none of checkMock's
 * lists, so no gate run measured them, and on Prayers' chants door they were
 * the worst of all (4.26 to 4.32:1). Now checkMock wears them by default
 * beside the five (WORN), and every caller that adds the looks takes them too
 * (EVERY).
 *
 * What it cannot see: the measure itself. `node scripts/mock-check.mjs
 * --self-test` runs the same lists' check before its fixtures.
 *
 * What a reader would notice if this broke: on Councils or Cappadocian, words
 * too faint to read where the gate said every palette passed.
 */

describe("checkMock's lists wear every palette of the registry", () => {
  it("the two earned by reading are their own list, each its own reading mode", () => {
    expect(EARNED).toEqual([
      ["Councils", "councils"],
      ["Cappadocian", "cappadocian"],
    ]);
  });

  it("checkMock wears them by default, beside the five palettes", () => {
    expect(PALETTES).toHaveLength(5);
    expect(WORN).toEqual([...PALETTES, ...EARNED]);
  });

  it("every palette and look of the registry is worn by EVERY, and nothing is left out", () => {
    expect(EVERY).toEqual([...PALETTES, ...EARNED, ...LOOKS]);
    expect(EVERY).toHaveLength(READING_THEMES.length);
    expect(paletteGaps()).toEqual([]);
  });

  it("the lists as they stood are caught leaving out both, by default and in every list", () => {
    expect(paletteGaps({ worn: PALETTES, every: [...PALETTES, ...LOOKS] })).toEqual([
      "Councils is in no list (EVERY)",
      "Councils is not worn by default (WORN)",
      "Cappadocian is in no list (EVERY)",
      "Cappadocian is not worn by default (WORN)",
    ]);
  });
});
