import { describe, expect, it } from "vitest";

import { previewCart } from "../cartPricing";

const now = 1_000_000;
const deal = { percent: 10, unitCents: 2249, listCents: 2499, endsAt: now + 60_000 };

describe("previewCart", () => {
  it("prices a live deal line at the deal and totals the saving", () => {
    const p = previewCart(
      [
        { slug: "beanie", quantity: 2, priceCents: 2499 },
        { slug: "ring", quantity: 1, priceCents: 1500 },
      ],
      { beanie: deal },
      now,
    );
    expect(p.subtotalCents).toBe(2249 * 2 + 1500);
    expect(p.savingsCents).toBe(500);
    expect(Object.keys(p.deals)).toEqual(["beanie"]);
  });

  it("drops a deal the moment it ends", () => {
    const p = previewCart([{ slug: "beanie", quantity: 1, priceCents: 2499 }], { beanie: deal }, deal.endsAt);
    expect(p.subtotalCents).toBe(2499);
    expect(p.savingsCents).toBe(0);
  });

  it("ignores a deal computed off a price the cart does not show", () => {
    const p = previewCart([{ slug: "beanie", quantity: 1, priceCents: 2999 }], { beanie: deal }, now);
    expect(p.subtotalCents).toBe(2999);
    expect(p.deals).toEqual({});
  });
});
