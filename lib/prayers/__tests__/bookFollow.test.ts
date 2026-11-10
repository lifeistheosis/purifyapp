// The prayer book's screen follows a chapter as it opens (1.9, build 89 note
// 8). His words: "I don't like how it doesn't move the screen also down in a
// smooth way, right? So if it like opens, right, you notice that it doesn't
// move with the actual opening."
//
// What it holds: how far the screen goes (followBy: enough for the page to end
// above the lowest bar, never so far that the title goes under the header,
// nothing for a page that opens in sight), the house curve the glide moves on,
// and that the glide runs with the fold, only when opening, and not with
// Purify's motion off. The export walk's section 48 watches it frame by frame.
//
// What a reader would notice if this broke: a chapter opened at the foot of
// the screen unfolding under the tab bar, out of sight, or the screen jumping.

import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { followBy } from "@/components/prayers/PrayerBookContents";
import { easeHouse } from "@/lib/ui/glideScroll";

describe("how far the screen follows a chapter opening", () => {
  // A phone 844 tall: the header's foot at 100, the tab bar at 758.
  const bars = { roof: 100, floor: 758 };

  it("is nothing for a page that opens in sight", () => {
    expect(followBy({ titleTop: 300, pageBottom: 700, ...bars })).toBe(0);
    expect(followBy({ titleTop: 300, pageBottom: 746, ...bars })).toBe(0);
  });

  it("is enough for the page to end above the tab bar, with room to spare", () => {
    expect(followBy({ titleTop: 600, pageBottom: 950, ...bars })).toBe(950 - (758 - 12));
  });

  it("never carries the title under the header, even for a page taller than the screen", () => {
    expect(followBy({ titleTop: 500, pageBottom: 1500, ...bars })).toBe(500 - (100 + 12));
    expect(followBy({ titleTop: 90, pageBottom: 1500, ...bars })).toBe(0);
  });
});

describe("the glide", () => {
  it("moves on the house curve, out quickly and settling", () => {
    expect(easeHouse(0)).toBeCloseTo(0, 5);
    expect(easeHouse(1)).toBeCloseTo(1, 5);
    expect(easeHouse(0.25)).toBeGreaterThan(0.6);
    for (let t = 0; t < 1; t += 0.05) expect(easeHouse(t + 0.05)).toBeGreaterThanOrEqual(easeHouse(t));
  });

  it("runs with the fold, only when a chapter opens, and not with Purify's motion off", () => {
    const src = fs.readFileSync("components/prayers/PrayerBookContents.tsx", "utf8");
    expect(src).toContain("const FOLD_MS = 240;");
    expect(src).toMatch(/const page = open\.at === was\.at \?/);
    expect(src).toContain("if (page instanceof HTMLElement && !prefersReducedMotion()) {");
    expect(src).toContain("if (by > 0) follow.current = glidePageBy(by, { ms: FOLD_MS });");
    // The fold it moves with is 240ms on the house curve.
    const css = fs.readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.book-fold \{[^}]*transition: grid-template-rows 240ms var\(--ease-house\);/);
    expect(css).toContain("--ease-house: cubic-bezier(0.22, 1, 0.36, 1);");
  });
});
