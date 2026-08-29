import { describe, expect, it } from "vitest";

import { inflate } from "../larp";

/**
 * Larp mode is a demo illusion, and the thing that makes it safe is what it
 * REFUSES to touch. A blanket multiply breaks the panel in ways that look like
 * bugs rather than like a demo: ids stop matching their rows, timestamps land
 * in the next century, percentages read 18400%, and a page limit of 50 becomes
 * a request for twenty thousand rows.
 *
 * So these mostly assert the deny list. The inflation itself is one line.
 */

describe("what larp inflates", () => {
  it("raises money and population", () => {
    const out = inflate({
      revenueCents: 1998,
      totalUsers: 3,
      unitsSold: 1,
      subscribers: 2,
    });
    expect(out.revenueCents).toBeGreaterThan(1998 * 100);
    expect(out.totalUsers).toBeGreaterThan(3 * 100);
    expect(out.unitsSold).toBeGreaterThan(1);
    expect(out.subscribers).toBeGreaterThan(2);
  });

  it("keeps whole things whole", () => {
    // A subscriber count of 1840.5 is a tell.
    const out = inflate({ totalUsers: 3, visitors: 8880 });
    expect(Number.isInteger(out.totalUsers)).toBe(true);
    expect(Number.isInteger(out.visitors)).toBe(true);
  });

  it("is stable across calls, so the panel does not flicker", () => {
    const a = inflate({ revenueCents: 1998 });
    const b = inflate({ revenueCents: 1998 });
    expect(a.revenueCents).toBe(b.revenueCents);
  });

  it("reaches into arrays and nested objects", () => {
    const out = inflate({
      shop: { netCents: 1998 },
      revenueSeries: [{ netCents: 100 }, { netCents: 200 }],
    });
    expect(out.shop.netCents).toBeGreaterThan(1998);
    expect(out.revenueSeries[0].netCents).toBeGreaterThan(100);
  });
});

describe("what larp must never touch", () => {
  it("leaves identity alone", () => {
    const out = inflate({ id: 42, user_id: 7, product_id: 9, version: 2, code: 200 });
    expect(out).toEqual({ id: 42, user_id: 7, product_id: 9, version: 2, code: 200 });
  });

  it("leaves time alone", () => {
    const out = inflate({ created_at: 1756000000, day: 12, month: 8, year: 2026 });
    expect(out).toEqual({ created_at: 1756000000, day: 12, month: 8, year: 2026 });
  });

  it("leaves proportions alone, or the panel prints 18400%", () => {
    const out = inflate({ percent: 62, conversionRate: 3.4, ratio: 0.5, share: 12 });
    expect(out).toEqual({ percent: 62, conversionRate: 3.4, ratio: 0.5, share: 12 });
  });

  it("leaves query shape alone, or a page turns into a table scan", () => {
    const out = inflate({ limit: 50, offset: 0, page: 2, size: 20 });
    expect(out).toEqual({ limit: 50, offset: 0, page: 2, size: 20 });
  });

  it("leaves a product's own price and cost alone", () => {
    // These are catalogue facts an operator reads to make decisions, not
    // performance figures. A larped price would misprice a real listing in the
    // one screen used to edit it.
    const out = inflate({ price_cents: 1299, supplier_cost_cents: 217 });
    expect(out).toEqual({ price_cents: 1299, supplier_cost_cents: 217 });
  });

  it("leaves geometry and chart ranges alone", () => {
    const out = inflate({ lat: 25.7, lng: -80.1, width: 1000, height: 300, days: 90 });
    expect(out).toEqual({ lat: 25.7, lng: -80.1, width: 1000, height: 300, days: 90 });
  });

  it("passes through anything it does not recognise", () => {
    // The safe direction: an uninflated number is a dull demo, an inflated one
    // that should not have moved is a broken screen.
    const out = inflate({ mysteryNumber: 5, label: "Overview", ok: true, nothing: null });
    expect(out).toEqual({ mysteryNumber: 5, label: "Overview", ok: true, nothing: null });
  });

  it("leaves zero at zero", () => {
    expect(inflate({ totalUsers: 0 }).totalUsers).toBe(0);
  });
});

describe("it cannot take the panel down", () => {
  it("survives a cycle instead of hanging", () => {
    const a: Record<string, unknown> = { totalUsers: 3 };
    a.self = a;
    expect(() => inflate(a)).not.toThrow();
  });

  it("survives absurd depth", () => {
    let deep: Record<string, unknown> = { totalUsers: 1 };
    for (let i = 0; i < 40; i++) deep = { nested: deep };
    expect(() => inflate(deep)).not.toThrow();
  });

  it("leaves non-finite numbers alone", () => {
    const out = inflate({ totalUsers: NaN, visitors: Infinity });
    expect(Number.isNaN(out.totalUsers)).toBe(true);
    expect(out.visitors).toBe(Infinity);
  });
});
