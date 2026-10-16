// Discover's library grid on a phone (lib/discover/grid.ts).
//
// The list's length is not fixed: the Shop tile comes and goes with its
// flag (the Kitchen's did too, until Chants took its place in 1.7 for every
// reader), and tiles are added as the library grows. The closing entries,
// Start here and Find a parish, have to land well under every count, and the
// way that goes wrong is a tile left alone beside an empty slot.

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
    for (const total of [8, 9, 10]) {
      for (let i = 0; i < total - DISCOVER_CLOSING; i++) {
        expect(isClosingRow(i, total, DISCOVER_CLOSING), `entry ${i} of ${total}`).toBe(false);
      }
    }
  });

  it("closes an even block of tiles with two rows", () => {
    // An even block of tiles, then Start here and Find a parish.
    expect(isClosingRow(7, 10, DISCOVER_CLOSING)).toBe(false);
    expect(isClosingRow(8, 10, DISCOVER_CLOSING)).toBe(true);
    expect(isClosingRow(9, 10, DISCOVER_CLOSING)).toBe(true);
  });

  it("lets Start here fill the slot an odd block of tiles leaves open", () => {
    // An odd block of tiles: Chat would stand alone, so Start here sits
    // beside it, and Find a parish is a row.
    expect(isClosingRow(6, 9, DISCOVER_CLOSING)).toBe(false);
    expect(isClosingRow(7, 9, DISCOVER_CLOSING)).toBe(false);
    expect(isClosingRow(8, 9, DISCOVER_CLOSING)).toBe(true);
  });

  it("always gives the last entry, Find a parish, a row of its own", () => {
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
  // as that list's last entries. An entry added after Find a parish would
  // pass every check above, take a row itself, and push Start here back
  // among the tiles.
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

  it("ends on the closing entries: Start here, then Find a parish", () => {
    expect(hrefs.slice(-DISCOVER_CLOSING)).toEqual(["/start", "/parishes"]);
  });

  it("has the Shop and Chat as its last tiles, and no Settings row", () => {
    // Tabs until 2026-10-13. The account went back to the bar as You.
    expect(hrefs.slice(-DISCOVER_CLOSING - 2, -DISCOVER_CLOSING)).toEqual(["/shop", "/community"]);
    expect(hrefs).not.toContain("/account");
    expect(block).toContain("...(shopEnabled()");
  });

  it("has Chants where the Kitchen was, for every reader, and no Kitchen", () => {
    // The owner, 2026-10-16: "Remove the kitchen and switch it out for
    // chants", in the same tile. Between Theology and the Calendar, with no
    // flag around it.
    expect(hrefs).toContain("/chants");
    expect(hrefs).not.toContain("/kitchen");
    expect(hrefs.indexOf("/chants")).toBe(hrefs.indexOf("/theology") + 1);
    expect(hrefs.indexOf("/calendar")).toBe(hrefs.indexOf("/chants") + 1);
    expect(block).not.toContain("trapezaEnabled");
  });

  it("is laid out with the shared count, not a second copy of it", () => {
    expect(source).toMatch(/isClosingRow\(\s*i,\s*entries\.length,\s*DISCOVER_CLOSING\s*\)/);
  });
});
