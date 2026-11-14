// A sold-out piece's Save heart stands over its card's link (1.9, Gate 2's
// second fault, 2026-11-14).
//
// A card of the shop (components/shop/ProductCard.tsx) is one stretched link
// over the whole card at z-10, with the Save heart at z-20 inside the
// vitrine. A sold-out piece's vitrine is dimmed (opacity-70), and an opacity
// under one makes the vitrine a stacking context of its own: the heart's z-20
// then counts only inside the vitrine, which stood under the link. On /shop/
// and /shop/category/all/ (the 33-Knot Orthodox Prayer Rope, out of stock) the
// finger at the heart met the link, so a tap on Save opened the piece. The
// pieces in stock passed: their vitrine is no stacking context.
//
// This reads the card as it is written and does the browser's arithmetic: on
// a sold-out card, either the vitrine makes no stacking context, or it stands
// over the link (a z higher than the link's) and lets every tap through but
// the heart's. The sold-out look is held as it was: the vitrine dimmed at 70.
//
// What a reader would notice if this broke: Save on a sold-out piece opens
// the piece instead of saving it.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const CARD = readFileSync(join(process.cwd(), "components", "shop", "ProductCard.tsx"), "utf8");

/** The classes a sold-out card's vitrine wears on top of its own. */
function soldOutVitrine(): string[] {
  const vitrine = /"shop-vitrine [^"]*",([\s\S]*?)\)\}\s*>/.exec(CARD)?.[1] ?? "";
  const extra = /soldOut && "([^"]+)"/.exec(vitrine)?.[1];
  if (extra === undefined) throw new Error("no sold-out classes on the vitrine");
  return extra.split(/\s+/);
}

/** The classes of the element whose class string holds `marker`. */
function classesWith(marker: RegExp): string[] {
  const m = new RegExp(`className="([^"]*${marker.source}[^"]*)"`).exec(CARD);
  if (!m) throw new Error(`no class string with ${marker}`);
  return m[1].split(/\s+/);
}

const z = (classes: string[]): number | null => {
  const c = classes.find((x) => /^z-\d+$/.test(x));
  return c ? Number(c.slice(2)) : null;
};
/** Classes that make an element a stacking context (with a position, as the vitrine has). */
const STACKING = /^(?:opacity-\d+|z-\d+|isolate|transform|scale-|rotate-|translate-|blur|filter|backdrop-|will-change-|mix-blend-)/;

describe("a sold-out piece's Save heart stands over its card's link", () => {
  const link = classesWith(/absolute inset-0 z-10 rounded-2xl/);
  const heart = classesWith(/absolute end-2 top-2 z-20/);
  const vitrine = soldOutVitrine();

  it("reads the link, the heart and the sold-out vitrine from the card", () => {
    expect(z(link)).toBe(10);
    expect(z(heart)).toBe(20);
    // The sold-out look stays as it was.
    expect(vitrine).toContain("opacity-70");
  });

  it("the dimmed vitrine stands over the link and lets a tap through to it, all but the heart's", () => {
    const stacks = vitrine.some((c) => STACKING.test(c));
    if (!stacks) return;
    // A stacking context of its own: its heart counts only as high as the vitrine does.
    expect(z(vitrine) ?? 0, "the sold-out vitrine's z, over the link's").toBeGreaterThan(z(link) ?? 0);
    expect(vitrine, "a tap on the picture still opens the piece").toContain("pointer-events-none");
    expect(heart, "the heart takes its own taps inside a vitrine that lets taps through").toContain("pointer-events-auto");
  });

  it("the pieces in stock are as they were: no stacking context on their vitrine", () => {
    const base = /"(shop-vitrine [^"]*)"/.exec(CARD)?.[1].split(/\s+/) ?? [];
    expect(base.filter((c) => STACKING.test(c))).toEqual([]);
  });
});
