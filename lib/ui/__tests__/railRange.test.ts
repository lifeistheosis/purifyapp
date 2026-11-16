// A sideways row stands inside its own range: never a pixel past its start in
// right to left (lib/ui/railRange.ts, components/ui/ScrollRail.tsx).
//
// Gate 6b (2026-11-16): /shop/category/all/ at 390 in Arabic, coming from the
// shop's front page, opened its chips 1 px past their start. The rail centred
// the current chip with a scroll by a distance; the first chip's middle cannot
// be reached, so the move ran into the start, and Chrome, which snaps a
// right-to-left row's range to whole pixels (-340 to +1 for those chips), let
// it end at +1. checkMock's mirror rule read every chip 2 px off its mirrored
// place.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withinRow } from "../railRange";

// The shop's chips in Arabic at 390, as the export draws them.
const chips = { scrollWidth: 731, clientWidth: 390 };

describe("a row's place inside its range", () => {
  it("right to left, a move into the start stands at the start, never past it", () => {
    // The opening move toward the first chip's middle, from the start.
    expect(withinRow(0 + 137.4, chips, true)).toBe(0);
    // From where Chrome lets a fling end, a pixel past the start.
    expect(withinRow(1 + 50, chips, true)).toBe(0);
    // Toward the end: no further than the overflow.
    expect(withinRow(-100000, chips, true)).toBe(-341);
    expect(withinRow(-120.5, chips, true)).toBe(-120.5);
  });

  it("left to right, from 0 to the overflow", () => {
    expect(withinRow(-137.4, chips, false)).toBe(0);
    expect(withinRow(100000, chips, false)).toBe(341);
    expect(withinRow(120.5, chips, false)).toBe(120.5);
  });

  it("a row that fits stands at its start either way", () => {
    expect(withinRow(40, { scrollWidth: 300, clientWidth: 390 }, true)).toBe(0);
    expect(withinRow(40, { scrollWidth: 300, clientWidth: 390 }, false)).toBe(0);
  });

  it("the rail asks for a place inside the range for each move it makes, never a distance", () => {
    const rail = readFileSync(join(__dirname, "..", "..", "..", "components", "ui", "ScrollRail.tsx"), "utf8");
    expect(rail).not.toMatch(/\.scrollBy\(/);
    // The opening move (centring what is current) and the arrows' nudge.
    expect(rail.match(/withinRow\(/g)?.length).toBe(2);
  });
});
