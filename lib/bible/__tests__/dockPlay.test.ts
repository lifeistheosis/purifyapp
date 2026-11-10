import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The reader's dock, its Play (build 89, the arbiter's ruling on note 16's
 * checkMock run): the round Play stood at 42px, under the house's 44, and its
 * mark and the pill's were each nudged a pixel right, which in Arabic reads
 * as placed by a side rather than mirrored. A play mark is not mirrored, so
 * the mark itself now carries its weight on the centre (Play's `centered`)
 * and needs no nudge.
 *
 * What would go wrong if this broke: a Play under a thumb's 44px again, or a
 * nudge that puts the triangle off its button's centre in one direction.
 */

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
const dock = read("components/bible/ReaderDock.tsx");
const icon = read("components/ui/icons/Play.tsx");

describe("the dock's Play", () => {
  it("is 44px, the house's target", () => {
    expect(dock).toContain('className="tap-press grid size-[44px] shrink-0 place-items-center rounded-full bg-paper text-night"');
    expect(dock).not.toContain("size-[42px]");
  });

  it("draws its mark on the button's centre, with no nudge to a side", () => {
    expect(dock).toContain("<Play size={18} centered />");
    expect(dock).toContain("<Play size={16} centered />");
    expect(dock).not.toMatch(/<Play[^>]*translate-x/);
  });

  it("is a triangle whose weight is on the centre of its box", () => {
    const d = icon.match(/centered \? "([^"]+)"/)?.[1];
    expect(d).toBeDefined();
    // M x y v h l dx dy: the three corners, and their centroid.
    const [x, y, v, dx, dy] = d!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const corners = [
      [x, y],
      [x, y + v],
      [x + dx, y + v + dy],
    ];
    const cx = corners.reduce((s, [px]) => s + px, 0) / 3;
    const cy = corners.reduce((s, [, py]) => s + py, 0) / 3;
    expect(Math.abs(cx - 12)).toBeLessThan(0.01);
    expect(Math.abs(cy - 12)).toBeLessThan(0.01);
    // And it stays inside its box.
    for (const [px, py] of corners) {
      expect(px).toBeGreaterThanOrEqual(0);
      expect(px).toBeLessThanOrEqual(24);
      expect(py).toBeGreaterThanOrEqual(0);
      expect(py).toBeLessThanOrEqual(24);
    }
  });
});
