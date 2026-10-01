import { describe, expect, it } from "vitest";

import { cartOffers, type OfferItem } from "../cartOffers";
import { EIKON_STORE_ID } from "../eikon";
import type { PromoConfig } from "../promotions";
import type { ShopProductFull } from "../types";

function product(over: Partial<ShopProductFull> & { slug: string }): ShopProductFull {
  return {
    id: over.slug,
    store_id: EIKON_STORE_ID,
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

// The live catalogue on 2026-10-01.
const VLADIMIR = product({ slug: "vladimir", price_cents: 2999 });
const TASSEL_ROPE = product({ slug: "tassel-rope", category: "prayer_corner", classification: "prayer_rope", inventory_status: "special_order", price_cents: 2995, units_sold: 1 });
const WALL_CROSS = product({ slug: "wall-cross", category: "crosses", classification: "wooden", price_cents: 1499, units_sold: 1 });
const GREEK_FLAG = product({ slug: "greek-flag", category: "flags", classification: "textile", price_cents: 2499 });
const BEANIE = product({ slug: "beanie", category: "crosses", classification: "textile", inventory_status: "special_order", price_cents: 2499 });
const RING = product({ slug: "ring", category: "sets", classification: "standard_reproduction", inventory_status: "special_order", price_cents: 2999 });
const CATALOGUE = [VLADIMIR, TASSEL_ROPE, WALL_CROSS, GREEK_FLAG, BEANIE, RING];

const BOTH: PromoConfig = { setPercent: 15, multiBuy: { minItems: 3, percent: 10 } };
const item = (p: ShopProductFull, quantity = 1): OfferItem => ({ slug: p.slug, quantity, priceCents: p.price_cents });

const offers = (items: OfferItem[], promotions: PromoConfig = BOTH, catalogue = CATALOGUE) =>
  cartOffers({ items, catalogue, deals: null, now: 0, promotions, shipping: { thresholdCents: 4500 } });

describe("cartOffers", () => {
  it("reads what each line is from the catalogue, so the cart prices it as checkout will", () => {
    const o = offers([item(VLADIMIR), item(TASSEL_ROPE), item(WALL_CROSS)]);
    expect(o.preview.subtotalCents).toBe(2549 + 2546 + 1274);
    expect(o.ladder.set).toEqual({ kind: "complete", sets: 1, percent: 15 });
    expect(o.setFinish).toBeNull();
  });

  it("prices a line it cannot find in the catalogue as nothing special", () => {
    const o = offers([item(VLADIMIR), item(TASSEL_ROPE), item(WALL_CROSS)], BOTH, [VLADIMIR, TASSEL_ROPE]);
    expect(o.preview.savingsCents).toBe(0);
  });

  it("offers the pieces that finish a set, and what adding them saves", () => {
    const o = offers([item(VLADIMIR)]);
    expect(o.setFinish?.add.map((p) => p.slug)).toEqual(["tassel-rope", "wall-cross"]);
    // Before: 2999 at list. After: the three at the set price.
    expect(o.setFinish?.savingsCents).toBe(7493 - 6369);
    expect(o.setFinish?.addedCents).toBe(6369 - 2999);
  });

  it("never suggests a kind the cart already has, whichever piece it is", () => {
    const otherRope = product({ slug: "33-knot", category: "prayer_corner", classification: "prayer_rope", price_cents: 1499, units_sold: 9 });
    const o = offers([item(VLADIMIR), item(otherRope)], BOTH, [...CATALOGUE, otherRope]);
    expect(o.setFinish?.add.map((p) => p.slug)).toEqual(["wall-cross"]);
  });

  it("has no set to finish without a set piece, with the set off, or from another store", () => {
    expect(offers([item(GREEK_FLAG)]).setFinish).toBeNull();
    expect(offers([item(VLADIMIR)], { setPercent: null, multiBuy: null }).setFinish).toBeNull();
    const theirs = product({ slug: "their-icon", store_id: "someone-else" });
    expect(offers([item(theirs)], BOTH, [...CATALOGUE, theirs]).setFinish).toBeNull();
  });

  it("offers as the bump a piece that gives the order something, priced as it would be", () => {
    // Free shipping already; a third piece reaches the multi-buy.
    const o = offers([item(VLADIMIR), item(GREEK_FLAG)]);
    expect(o.tripwire?.product.slug).toBe("wall-cross");
    expect(o.tripwire?.unlocks).toBe("multi_buy");
    expect(o.tripwire?.unitCents).toBe(percentOf(1499, 90));
  });

  it("prefers the piece that clears free shipping over a better seller that does not", () => {
    const big = product({ slug: "big", price_cents: 3500 });
    const popular = product({ slug: "popular", price_cents: 900, units_sold: 50 });
    const enough = product({ slug: "enough", price_cents: 1200, units_sold: 1 });
    const catalogue = [big, popular, enough];
    const o = offers([item(big)], { setPercent: null, multiBuy: null }, catalogue);
    expect(o.tripwire).toMatchObject({ unlocks: "free_shipping", unitCents: 1200 });
    expect(o.tripwire?.product.slug).toBe("enough");
  });

  it("falls back to the ordinary bump, saying nothing more, when no piece unlocks anything", () => {
    const o = offers([item(RING)], { setPercent: null, multiBuy: null });
    expect(o.tripwire).toMatchObject({ unlocks: null });
    expect(o.tripwire?.product.slug).toBe("wall-cross");
  });

  it("skips the bump where it is not shown", () => {
    const o = cartOffers({
      items: [item(VLADIMIR)],
      catalogue: CATALOGUE,
      deals: null,
      now: 0,
      promotions: BOTH,
      shipping: { thresholdCents: 4500 },
      tripwire: false,
    });
    expect(o.tripwire).toBeNull();
  });
});

function percentOf(cents: number, pct: number): number {
  return Math.round((cents * pct) / 100);
}
