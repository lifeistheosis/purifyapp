import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Prayers in Arabic: everything is where it was, measured from the other
 * side (checkMock's mirror check). Walking the contrast sweep it found two
 * things on Prayers that stayed put (2026-11-10): the soft sheen in a tile's
 * corner, placed from the right, and the play mark in the round button,
 * nudged a pixel right. A sheen is placed from the end now, so it mirrors with
 * its tile. A play mark points right in every language and is not mirrored,
 * so it is drawn with its weight on its box's centre (the house's Play,
 * `centered`) and needs no nudge that Arabic would read as a side.
 */
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const TILES = "components/mobile/SoftTiles.tsx";
const PAGE = "app/(app)/prayers/page.tsx";

describe("Prayers in Arabic", () => {
  it("places a tile's sheen from its end, not from its right", () => {
    const sheens = [...read(TILES).matchAll(/className="(tile-sheen [^"]*)"/g)].map((m) => m[1]);
    expect(sheens.length).toBeGreaterThan(0);
    for (const cls of sheens) {
      expect(cls, cls).toMatch(/(?:^|\s)-?end-\d/);
      expect(cls, cls).not.toMatch(/(?:^|\s)-?(?:left|right)-\d/);
    }
  });

  it("draws the play mark centred on its box, with no nudge to a side", () => {
    for (const file of [TILES, PAGE]) {
      const source = read(file);
      expect(source, file).toMatch(/<Play size=\{\d+\} centered \/>/);
      expect(source, file).not.toContain("translate-x-[1px]");
      expect(source, file).not.toContain('d="M7 5.5v13l11-6.5L7 5.5z"');
    }
  });
});
