import { describe, expect, it } from "vitest";

import { featuredIcon, newIn } from "../featured";
import type { ShopProductFull } from "../types";

// Only the fields featured.ts (and sets.ts roleOf) read; the rest is stubbed.
function piece(slug: string, over: Partial<ShopProductFull> & { view_count?: number } = {}): ShopProductFull {
  return {
    slug,
    title: slug,
    category: "saints",
    classification: "printed_mounted",
    inventory_status: "special_order",
    media: [{ id: `${slug}-m`, media_url: `/shop/media/${slug}.jpg`, alt_text: slug, sort_order: 0, is_primary: true }],
    subjects: [],
    units_sold: 0,
    created_at: "2026-07-04T12:00:00+00:00",
    ...over,
  } as ShopProductFull;
}

const day = (d: number) => `2026-07-${String(d).padStart(2, "0")}T12:00:00+00:00`;

describe("featuredIcon", () => {
  it("features an icon only: never a rope, a cross or a set", () => {
    const pick = featuredIcon([
      piece("rope", { category: "prayer_ropes", classification: "prayer_rope", units_sold: 90 }),
      piece("cross", { category: "crosses", classification: "cross", units_sold: 80 }),
      piece("diptych", { category: "sets", classification: "wooden", units_sold: 70 }),
      piece("nicholas", { units_sold: 1 }),
    ]);
    expect(pick?.slug).toBe("nicholas");
  });

  it("needs a photograph and something that can be bought now", () => {
    const pick = featuredIcon([
      piece("no-photo", { media: [], units_sold: 50 }),
      piece("gone", { inventory_status: "out_of_stock", units_sold: 40 }),
      piece("coming", { inventory_status: "coming_soon", units_sold: 30 }),
      piece("buyable"),
    ]);
    expect(pick?.slug).toBe("buyable");
  });

  it("puts what is in hand first, then the most bought", () => {
    expect(
      featuredIcon([
        piece("made-to-order-best-seller", { units_sold: 40 }),
        piece("in-hand", { inventory_status: "ready_to_ship", units_sold: 2 }),
        piece("in-hand-best", { inventory_status: "ready_to_ship", units_sold: 9 }),
      ])?.slug,
    ).toBe("in-hand-best");
  });

  it("breaks a tie on sales by views, then by the newest", () => {
    expect(
      featuredIcon([
        piece("seen-less", { view_count: 3 }),
        piece("seen-most", { view_count: 12 }),
      ])?.slug,
    ).toBe("seen-most");
    expect(
      featuredIcon([
        piece("older", { created_at: day(4) }),
        piece("newer", { created_at: day(20) }),
      ])?.slug,
    ).toBe("newer");
  });

  it("features nothing when the shop has no such icon", () => {
    expect(featuredIcon([])).toBeNull();
    expect(featuredIcon([piece("rope", { category: "prayer_ropes", classification: "prayer_rope" })])).toBeNull();
  });

  it("does not reorder the catalogue it is given", () => {
    const catalogue = [piece("a", { units_sold: 1 }), piece("b", { units_sold: 5 })];
    featuredIcon(catalogue);
    expect(catalogue.map((p) => p.slug)).toEqual(["a", "b"]);
  });
});

describe("newIn", () => {
  const catalogue = [
    piece("first-added", { created_at: day(1) }),
    piece("sold-out-newest", { created_at: day(30), inventory_status: "out_of_stock" }),
    piece("newest", { created_at: day(28) }),
    piece("featured", { created_at: day(27) }),
    piece("third", { created_at: day(20), category: "prayer_ropes", classification: "prayer_rope" }),
    piece("fourth", { created_at: day(10), inventory_status: "coming_soon" }),
  ];

  it("shows the newest pieces of any kind first, none sold out, none already shown", () => {
    expect(newIn(catalogue, 3, ["featured"]).map((p) => p.slug)).toEqual(["newest", "third", "fourth"]);
  });

  it("shows at most as many as asked, and fewer when the shop has fewer", () => {
    expect(newIn(catalogue, 2)).toHaveLength(2);
    expect(newIn(catalogue, 10)).toHaveLength(5);
    expect(newIn(catalogue, 0)).toEqual([]);
  });

  it("keeps the catalogue's order for pieces added at the same moment", () => {
    const same = [piece("x", { created_at: day(5) }), piece("y", { created_at: day(5) })];
    expect(newIn(same, 2).map((p) => p.slug)).toEqual(["x", "y"]);
  });
});
