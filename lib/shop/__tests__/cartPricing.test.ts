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

describe("previewCart with the standing offers", () => {
  const set = [
    { slug: "icon", quantity: 1, priceCents: 2999, role: "icon" as const, eligible: true },
    { slug: "rope", quantity: 1, priceCents: 2995, role: "rope" as const, eligible: true },
    { slug: "cross", quantity: 1, priceCents: 1499, role: "cross" as const, eligible: true },
  ];

  it("prices the set as checkout will", () => {
    const p = previewCart(set, null, now, { setPercent: 15, multiBuy: null });
    expect(p.subtotalCents).toBe(6369);
    expect(p.savingsCents).toBe(1124);
  });

  it("drops a deal's countdown when the set price beats it, and keeps it when it wins", () => {
    const shallow = { percent: 5, unitCents: 2849, listCents: 2999, endsAt: now + 60_000 };
    const beaten = previewCart(set, { icon: shallow }, now, { setPercent: 15, multiBuy: null });
    expect(beaten.deals).toEqual({});
    expect(beaten.priced.segments[0]).toMatchObject({ kind: "set_bundle", unitCents: 2549 });

    const deep = { percent: 30, unitCents: 2099, listCents: 2999, endsAt: now + 60_000 };
    const kept = previewCart(set, { icon: deep }, now, { setPercent: 15, multiBuy: null });
    expect(Object.keys(kept.deals)).toEqual(["icon"]);
    expect(kept.subtotalCents).toBe(2099 + 2546 + 1274);
  });

  it("gives an unknown line nothing it cannot prove", () => {
    const p = previewCart(
      set.map(({ slug, quantity, priceCents }) => ({ slug, quantity, priceCents })),
      null,
      now,
      { setPercent: 15, multiBuy: null },
    );
    expect(p.savingsCents).toBe(0);
  });
});
