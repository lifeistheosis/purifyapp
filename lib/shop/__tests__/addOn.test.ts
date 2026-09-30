import { describe, expect, it } from "vitest";

import { cartStore, pickAddOn, pickOrderBump, type AddOnCandidate } from "../addOn";

const p = (slug: string, o: Partial<AddOnCandidate> = {}): AddOnCandidate => ({
  slug,
  store_id: "eikon",
  price_cents: 1000,
  inventory_status: "ready_to_ship",
  units_sold: 0,
  ...o,
});

describe("the order bump", () => {
  it("offers nothing when the cart's store is unknown or mixed", () => {
    const all = [p("a"), p("b", { store_id: "other" }), p("c")];
    expect(cartStore(all, new Set(["zz"]))).toBeNull();
    expect(cartStore(all, new Set(["a", "b"]))).toBeNull();
    expect(pickOrderBump(all, new Set(["a", "b"]), 5000)).toBeNull();
  });

  it("stays in the cart's store and out of the cart", () => {
    const all = [p("a"), p("b", { store_id: "other", units_sold: 99 }), p("c")];
    expect(pickOrderBump(all, new Set(["a"]), 5000)?.slug).toBe("c");
  });

  it("is sized to the order: 40% of it, or fifteen dollars", () => {
    const all = [p("in", { price_cents: 3000 }), p("big", { price_cents: 1900, units_sold: 9 }), p("small", { price_cents: 1400 })];
    expect(pickOrderBump(all, new Set(["in"]), 5000)?.slug).toBe("big");
    expect(pickOrderBump(all, new Set(["in"]), 3000)?.slug).toBe("small");
  });

  it("offers only what can be bought, best seller first", () => {
    const all = [
      p("in"),
      p("gone", { inventory_status: "out_of_stock", units_sold: 50 }),
      p("soon", { inventory_status: "coming_soon", units_sold: 40 }),
      p("made", { inventory_status: "special_order", units_sold: 3 }),
      p("stock", { units_sold: 1 }),
    ];
    expect(pickOrderBump(all, new Set(["in"]), 5000)?.slug).toBe("made");
  });

  it("follows up after a purchase from the same store, whatever its price", () => {
    const all = [p("bought"), p("dear", { price_cents: 90000, units_sold: 5 }), p("other", { store_id: "x", units_sold: 9 })];
    expect(pickAddOn(all, { storeId: "eikon", exclude: new Set(["bought"]) })?.slug).toBe("dear");
  });
});
