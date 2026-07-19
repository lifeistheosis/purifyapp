// The escalation rule. The product promise is that a bigger gift visibly
// opens better, so the ordering is pinned here: a refactor that flattens the
// levels, or lets a small gift outrank a large one, would be invisible in a
// code review and obvious to the person receiving it.

import { describe, it, expect } from "vitest";
import {
  emberOffsets,
  giftLevel,
  giftPresentation,
} from "@/lib/gifts/presentation";

describe("giftLevel — bigger gifts rank higher", () => {
  it("the smallest gift is the plainest casket", () => {
    expect(giftLevel("plus", 30)).toBe(1);
  });

  it("the largest gift is the great reliquary", () => {
    expect(giftLevel("pro", 365)).toBe(5);
    expect(giftLevel("pro", 730)).toBe(5);
  });

  it("the three durations the owner picks from are all distinct on Plus", () => {
    const levels = [30, 90, 365].map((d) => giftLevel("plus", d));
    expect(levels).toEqual([1, 2, 4]);
    expect(new Set(levels).size).toBe(3);
  });

  it("Pro outranks Plus at the same duration, every time", () => {
    for (const days of [30, 90, 180, 365, 730]) {
      expect(giftLevel("pro", days)).toBeGreaterThan(
        Math.min(giftLevel("plus", days), 4),
      );
    }
  });

  it("never decreases as the duration grows", () => {
    for (const tier of ["plus", "pro"] as const) {
      const seq = [30, 90, 180, 365, 730].map((d) => giftLevel(tier, d));
      const sorted = [...seq].sort((a, b) => a - b);
      expect(seq).toEqual(sorted);
    }
  });

  it("a long Plus gift still beats the shortest Pro gift's plainness", () => {
    // Someone gifted a year is never handed a level-1 or level-2 box.
    expect(giftLevel("plus", 365)).toBeGreaterThanOrEqual(4);
  });
});

describe("giftPresentation — each level looks and moves differently", () => {
  /** One real gift per level, cheapest to grandest. */
  const ASCENDING = [
    giftPresentation("plus", 30), // 1
    giftPresentation("plus", 90), // 2
    giftPresentation("pro", 30), // 3
    giftPresentation("pro", 90), // 4
    giftPresentation("pro", 365), // 5
  ];

  it("covers all five levels with no gaps or repeats", () => {
    expect(ASCENDING.map((p) => p.level)).toEqual([1, 2, 3, 4, 5]);
  });

  it("ornament only ever accumulates", () => {
    const ornaments = ASCENDING.map(({ casket: c }) =>
      [c.bands, c.mounts, c.bosses, c.filigree, c.finials].filter(Boolean).length,
    );
    expect(ornaments).toEqual([...ornaments].sort((a, b) => a - b));
    expect(ornaments[0]).toBeLessThan(ornaments[4]);
  });

  it("the metal catches more light at every level", () => {
    const gilt = ASCENDING.map((p) => p.casket.gilt);
    expect(gilt).toEqual([...gilt].sort((a, b) => a - b));
    expect(new Set(gilt).size).toBe(5);
  });

  it("ornament is drawn brightly enough to actually see on a near-black box", () => {
    // The first pass set gilt around 0.2-0.5, which multiplied down to ~0.16
    // fills and made every level look identical on screen. Nothing may be so
    // faint again.
    for (const p of ASCENDING) {
      expect(p.casket.gilt).toBeGreaterThanOrEqual(0.4);
    }
  });

  it("the casket's own material lightens with the level", () => {
    const metal = ASCENDING.map((p) => p.casket.metal);
    expect(metal).toEqual([...metal].sort((a, b) => a - b));
    expect(metal[0]).toBe(0);
    expect(metal[4]).toBeGreaterThan(0.6);
  });

  it("the plainest casket has a different SILHOUETTE, not just less detail", () => {
    expect(ASCENDING[0].casket.lid).toBe("slab");
    for (const p of ASCENDING.slice(1)) {
      expect(p.casket.lid).toBe("gable");
    }
  });

  it("the ceremony lengthens with the level", () => {
    const durations = ASCENDING.map((p) => p.motion.openTotalMs);
    expect(durations).toEqual([...durations].sort((a, b) => a - b));
    expect(new Set(durations).size).toBe(5);
  });

  it("only the plainest casket skips the strain, and only the grandest gets two ray layers", () => {
    expect(giftPresentation("plus", 30).motion.strain).toBe(false);
    expect(giftPresentation("plus", 90).motion.strain).toBe(true);
    expect(giftPresentation("pro", 365).light.rays).toBe(2);
    expect(giftPresentation("pro", 90).light.rays).toBe(1);
    expect(giftPresentation("plus", 30).light.rays).toBe(0);
  });

  it("the seal only cracks from level 3 up", () => {
    expect(giftPresentation("plus", 30).motion.sealBreak).toBe(false);
    expect(giftPresentation("plus", 90).motion.sealBreak).toBe(false);
    expect(giftPresentation("pro", 30).motion.sealBreak).toBe(true);
  });

  it("embers grow with the level", () => {
    const embers = ASCENDING.map((p) => p.light.embers);
    expect(embers).toEqual([...embers].sort((a, b) => a - b));
    expect(new Set(embers).size).toBe(5);
  });
});

describe("emberOffsets", () => {
  it("spreads evenly and symmetrically", () => {
    const o = emberOffsets(5);
    expect(o).toHaveLength(5);
    expect(o[0]).toBe(-66);
    expect(o[4]).toBe(66);
    expect(o[2]).toBe(0);
  });

  it("handles the degenerate counts", () => {
    expect(emberOffsets(0)).toEqual([]);
    expect(emberOffsets(1)).toEqual([0]);
  });
});
