import { describe, expect, it } from "vitest";

import { prayerCornerSet, roleOf, setCompletion, setShipsFree } from "../sets";
import type { ShopProductFull } from "../types";

function product(over: Partial<ShopProductFull> & { slug: string }): ShopProductFull {
  return {
    id: over.slug,
    store_id: "s",
    seller_id: "x",
    title: over.slug,
    subtitle: null,
    description_md: null,
    price_cents: 2000,
    currency: "usd",
    category: "saints",
    classification: "wooden",
    fulfillment_type: "eikon_two_stage",
    inventory_status: "ready_to_ship",
    quantity_available: 2,
    dispatch_min_days: 1,
    dispatch_max_days: 3,
    materials: null,
    dimensions: null,
    production_method: null,
    maker_name: null,
    country_of_origin: null,
    image_is_representative: false,
    status: "published",
    created_at: "2026-09-01T00:00:00Z",
    media: [],
    subjects: [],
    store: { slug: "eikon", public_name: "EIKON", ownership_disclosure: "" },
    ...over,
  };
}

// The live catalogue on 2026-09-30, reduced to what the set reads.
const VLADIMIR = product({ slug: "vladimir", price_cents: 2999 });
const TASSEL_ROPE = product({ slug: "tassel-rope", category: "prayer_corner", classification: "prayer_rope", inventory_status: "special_order", price_cents: 2995 });
const KNOT_ROPE = product({ slug: "33-knot", category: "prayer_corner", classification: "prayer_rope", inventory_status: "out_of_stock", price_cents: 1499, review_count: 1, rating_total: 5 });
const WALL_CROSS = product({ slug: "wall-cross", category: "crosses", classification: "wooden", price_cents: 1499 });
const BEANIE = product({ slug: "beanie", category: "crosses", classification: "textile" });
const FLAG = product({ slug: "flag", category: "flags", classification: "textile" });
const RING = product({ slug: "ring", category: "sets", classification: "standard_reproduction" });
const CATALOGUE = [FLAG, RING, BEANIE, VLADIMIR, KNOT_ROPE, TASSEL_ROPE, WALL_CROSS];

describe("the prayer corner set", () => {
  it("knows what each piece can be, and that a beanie, a flag and a ring are none of them", () => {
    expect(roleOf(VLADIMIR)).toBe("icon");
    expect(roleOf(TASSEL_ROPE)).toBe("rope");
    expect(roleOf(WALL_CROSS)).toBe("cross");
    expect([BEANIE, FLAG, RING].map(roleOf)).toEqual([null, null, null]);
  });

  it("takes one of each that can be bought, and adds up their own prices", () => {
    const set = prayerCornerSet(CATALOGUE)!;
    expect(set.pieces.map((p) => p.slug)).toEqual(["vladimir", "tassel-rope", "wall-cross"]);
    expect(set.totalCents).toBe(2999 + 2995 + 1499);
  });

  it("says it ships free only when the three clear the shop's own threshold", () => {
    const set = prayerCornerSet(CATALOGUE)!;
    expect(setShipsFree(set, 4500)).toBe(true);
    expect(setShipsFree(set, 10000)).toBe(false);
    expect(setShipsFree(set, null)).toBe(false);
  });

  it("judges free shipping on the price the set is charged, once it is discounted", () => {
    const set = prayerCornerSet(CATALOGUE)!;
    expect(setShipsFree(set, 7000)).toBe(true);
    expect(setShipsFree(set, 7000, 6369)).toBe(false);
  });

  it("is built around the piece on the page", () => {
    const other = product({ slug: "st-nicholas", price_cents: 4200 });
    expect(prayerCornerSet([...CATALOGUE, other], other)!.icon.slug).toBe("st-nicholas");
    expect(prayerCornerSet(CATALOGUE, WALL_CROSS)!.cross.slug).toBe("wall-cross");
  });

  it("is offered nowhere a piece has no place in it, and not at all without every kind", () => {
    expect(prayerCornerSet(CATALOGUE, FLAG)).toBeNull();
    expect(prayerCornerSet(CATALOGUE, KNOT_ROPE)).toBeNull();
    expect(prayerCornerSet([VLADIMIR, TASSEL_ROPE])).toBeNull();
  });
});

describe("finishing a set from the cart", () => {
  it("adds the kinds the cart lacks, the shop's best of each", () => {
    expect(setCompletion([VLADIMIR], CATALOGUE)?.map((p) => p.slug)).toEqual(["tassel-rope", "wall-cross"]);
  });

  it("never suggests a kind the cart has, and nothing for a whole set or no set piece", () => {
    const otherIcon = product({ slug: "st-nicholas", price_cents: 4200 });
    expect(setCompletion([otherIcon, TASSEL_ROPE], CATALOGUE)?.map((p) => p.slug)).toEqual(["wall-cross"]);
    expect(setCompletion([VLADIMIR, TASSEL_ROPE, WALL_CROSS], CATALOGUE)).toBeNull();
    expect(setCompletion([FLAG, RING], CATALOGUE)).toBeNull();
  });

  it("fills a gap only from the cart's own store, and not at all when it cannot", () => {
    const theirs = product({ slug: "their-icon", store_id: "other" });
    expect(setCompletion([theirs], CATALOGUE)).toBeNull();
    expect(setCompletion([VLADIMIR], [VLADIMIR, TASSEL_ROPE])).toBeNull();
  });
});
