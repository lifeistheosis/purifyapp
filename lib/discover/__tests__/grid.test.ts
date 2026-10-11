// Discover's library grid on a phone (lib/discover/grid.ts).
//
// The list's length is not fixed: the Kitchen tile comes and goes with its
// flag, so the library is five tiles in one build and six in another. The
// closing entries, Find a parish and Settings, have to land well under both,
// and the way that goes wrong is a tile left alone beside an empty slot.

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { DISCOVER_CLOSING, isClosingRow } from "@/lib/discover/grid";

const ROOT = path.resolve(__dirname, "..", "..", "..");

/** Lay the list out two across and count the slots left empty. */
function emptySlots(total: number, closing: number): number {
  let column = 0;
  let empty = 0;
  for (let i = 0; i < total; i++) {
    if (isClosingRow(i, total, closing)) {
      // A row starts on a fresh line, so a tile waiting alone is stranded.
      if (column === 1) empty += 1;
      column = 0;
    } else {
      column = column === 0 ? 1 : 0;
    }
  }
  return column === 1 ? empty + 1 : empty;
}

describe("the Discover grid", () => {
  it("draws the library as tiles", () => {
    for (const total of [7, 8]) {
      for (let i = 0; i < total - DISCOVER_CLOSING; i++) {
        expect(isClosingRow(i, total, DISCOVER_CLOSING), `entry ${i} of ${total}`).toBe(false);
      }
    }
  });

  it("closes an even library with two rows", () => {
    // Six tiles (the Kitchen is on), then Find a parish and Settings.
    expect(isClosingRow(6, 8, DISCOVER_CLOSING)).toBe(true);
    expect(isClosingRow(7, 8, DISCOVER_CLOSING)).toBe(true);
  });

  it("lets Find a parish fill the slot an odd library leaves open", () => {
    // Five tiles (the Kitchen is off): the calendar would stand alone, so
    // Find a parish sits beside it and only Settings is a row.
    expect(isClosingRow(5, 7, DISCOVER_CLOSING)).toBe(false);
    expect(isClosingRow(6, 7, DISCOVER_CLOSING)).toBe(true);
  });

  it("always gives the last entry, Settings, a row of its own", () => {
    for (let total = DISCOVER_CLOSING; total <= 14; total++) {
      expect(isClosingRow(total - 1, total, DISCOVER_CLOSING), `${total} entries`).toBe(true);
    }
  });

  it("never leaves a row half empty, whatever the flags make of the list", () => {
    for (let total = DISCOVER_CLOSING; total <= 14; total++) {
      expect(emptySlots(total, DISCOVER_CLOSING), `${total} entries`).toBe(0);
    }
  });
});

describe("the list the grid is handed", () => {
  // DISCOVER_CLOSING counts from the end of the list in
  // components/mobile/DiscoverMobile.tsx, so the rule above is only as true
  // as that list's last entries. An entry added after Settings would pass
  // every check above, take a row itself, and push Find a parish back among
  // the tiles.
  //
  // Read as text because the component is a server one with next and React
  // behind it, and this suite runs in plain node.
  const source = fs.readFileSync(
    path.join(ROOT, "components", "mobile", "DiscoverMobile.tsx"),
    "utf8",
  );

  // Only the list itself: from its declaration to the bracket that closes it.
  const start = source.indexOf("const entries: DiscoverEntry[] = [");
  const block = source.slice(start, source.indexOf("\n  ];", start));
  const hrefs = [...block.matchAll(/href:\s*"(\/[a-z-]+)"/g)].map((m) => m[1]);

  it("reads the list", () => {
    // A regex that quietly matched nothing would pass the check below.
    expect(start).toBeGreaterThan(-1);
    expect(hrefs.length).toBeGreaterThan(DISCOVER_CLOSING + 3);
  });

  it("ends on the closing entries, Find a parish and then Settings", () => {
    expect(hrefs.slice(-DISCOVER_CLOSING)).toEqual(["/parishes", "/account"]);
  });

  it("is laid out with the shared count, not a second copy of it", () => {
    expect(source).toMatch(/isClosingRow\(\s*i,\s*entries\.length,\s*DISCOVER_CLOSING\s*\)/);
  });
});
