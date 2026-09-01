import { describe, expect, it } from "vitest";

import { earningsSummary, monthlyEarnings, topProducts } from "../earnings";

// Ids are sequential rather than random so a fee lookup in a test can name
// the order it belongs to without threading the id back out of the fixture.
let nextId = 0;

function order(
  totalCents: number,
  paymentStatus: "pending" | "paid" | "refunded" | "cancelled",
  createdAt: string,
  items: { title: string; unit_price_cents: number; quantity: number; product_id?: string | null }[] = [
    { title: "Icon", unit_price_cents: totalCents, quantity: 1 },
  ],
) {
  return {
    id: `o${++nextId}`,
    total_cents: totalCents,
    payment_status: paymentStatus,
    created_at: createdAt,
    items: items.map((i) => ({ product_id: null, ...i })),
  };
}

/** A fee map for the orders passed in, at a flat rate on the whole total. */
function feesFor(
  orders: { id: string; total_cents: number }[],
  bps = 1000,
): Map<string, { application_fee_cents: number }> {
  return new Map(
    orders.map((o) => [
      o.id,
      { application_fee_cents: Math.round((o.total_cents * bps) / 10_000) },
    ]),
  );
}

describe("earningsSummary", () => {
  it("zeroes out cleanly with no orders", () => {
    const s = earningsSummary([]);
    expect(s.grossCents).toBe(0);
    expect(s.netCents).toBe(0);
    expect(s.averageOrderCents).toBe(0);
    expect(s.refundRate).toBe(0);
  });

  it("counts paid and refunded, ignores pending and cancelled", () => {
    const s = earningsSummary([
      order(5000, "paid", "2026-07-01T00:00:00Z"),
      order(3000, "refunded", "2026-07-02T00:00:00Z"),
      order(9999, "pending", "2026-07-03T00:00:00Z"),
      order(7777, "cancelled", "2026-07-04T00:00:00Z"),
    ]);
    expect(s.grossCents).toBe(8000);
    expect(s.refundedCents).toBe(3000);
    expect(s.netCents).toBe(5000);
    expect(s.paidOrderCount).toBe(2);
    expect(s.refundedOrderCount).toBe(1);
    expect(s.refundRate).toBe(0.5);
  });

  it("separates orders ever paid from orders still paid", () => {
    // The distinction the admin panel got wrong. paidOrderCount is the
    // refundRate denominator and counts an order that was paid and then
    // refunded; keptOrderCount is the one that matches netCents. Printing the
    // first beside the word "paid" reported one sale and one refund of it as
    // two sales.
    const s = earningsSummary([
      order(5000, "paid", "2026-07-01T00:00:00Z"),
      order(3000, "refunded", "2026-07-02T00:00:00Z"),
    ]);
    expect(s.paidOrderCount).toBe(2);
    expect(s.keptOrderCount).toBe(1);
    expect(s.netCents).toBe(5000);
  });

  it("keptOrderCount is zero when every order was refunded", () => {
    const s = earningsSummary([
      order(5000, "refunded", "2026-07-01T00:00:00Z"),
      order(3000, "refunded", "2026-07-02T00:00:00Z"),
    ]);
    expect(s.keptOrderCount).toBe(0);
    expect(s.netCents).toBe(0);
    expect(s.averageOrderCents).toBe(0);
  });

  it("averages over kept orders only", () => {
    const s = earningsSummary([
      order(4000, "paid", "2026-07-01T00:00:00Z"),
      order(6000, "paid", "2026-07-02T00:00:00Z"),
      order(9000, "refunded", "2026-07-03T00:00:00Z"),
    ]);
    // net 10000 across 2 kept orders.
    expect(s.averageOrderCents).toBe(5000);
  });

  it("sums units across items and quantities", () => {
    const s = earningsSummary([
      order(9000, "paid", "2026-07-01T00:00:00Z", [
        { title: "A", unit_price_cents: 3000, quantity: 2 },
        { title: "B", unit_price_cents: 3000, quantity: 1 },
      ]),
    ]);
    expect(s.unitsSold).toBe(3);
  });
});

describe("monthlyEarnings", () => {
  it("buckets by month, newest first, net = gross - refunded", () => {
    const rows = monthlyEarnings([
      order(5000, "paid", "2026-06-15T00:00:00Z"),
      order(2000, "refunded", "2026-06-20T00:00:00Z"),
      order(4000, "paid", "2026-07-01T00:00:00Z"),
      order(1000, "pending", "2026-07-02T00:00:00Z"),
    ]);
    expect(rows.map((r) => r.month)).toEqual(["2026-07", "2026-06"]);
    expect(rows[1]).toMatchObject({
      grossCents: 7000,
      refundedCents: 2000,
      netCents: 5000,
      orderCount: 2,
    });
    expect(rows[0]).toMatchObject({ grossCents: 4000, orderCount: 1 });
  });
});

describe("topProducts", () => {
  it("ranks by gross and excludes refunded orders entirely", () => {
    const rows = topProducts([
      order(10000, "paid", "2026-07-01T00:00:00Z", [
        { title: "Pantocrator", unit_price_cents: 5000, quantity: 2 },
      ]),
      order(6000, "paid", "2026-07-02T00:00:00Z", [
        { title: "Theotokos", unit_price_cents: 6000, quantity: 1 },
      ]),
      order(50000, "refunded", "2026-07-03T00:00:00Z", [
        { title: "Big Refund", unit_price_cents: 50000, quantity: 1 },
      ]),
    ]);
    expect(rows.map((r) => r.title)).toEqual(["Pantocrator", "Theotokos"]);
    expect(rows[0]).toMatchObject({ units: 2, grossCents: 10000 });
  });

  it("respects the limit", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      order(1000 + i, "paid", "2026-07-01T00:00:00Z", [
        { title: `Icon ${i}`, unit_price_cents: 1000 + i, quantity: 1 },
      ]),
    );
    expect(topProducts(many, 3)).toHaveLength(3);
  });
});

/**
 * The two untruths this module used to publish, asserted so they cannot come
 * back. Both were live on the seller earnings page.
 */
describe("commission is a number, or it is unknown", () => {
  it("reports null, not zero, when no fee map is supplied at all", () => {
    // netCents was documented as "what the seller actually keeps before fees"
    // while subtracting no fee. A confident $0.00 in fees beside an order
    // whose money is sitting in Purify's balance is the same lie.
    const s = earningsSummary([order(5000, "paid", "2026-07-01T00:00:00Z")]);
    expect(s.commissionCents).toBeNull();
    expect(s.payoutCents).toBeNull();
  });

  it("reports null when even one counted order has no fee row", () => {
    const a = order(5000, "paid", "2026-07-01T00:00:00Z");
    const b = order(3000, "paid", "2026-07-02T00:00:00Z");
    // Only `a` was charged through Connect. `b` predates it.
    const s = earningsSummary([a, b], feesFor([a]));
    expect(s.ordersWithoutFeeRecord).toBe(1);
    expect(s.commissionCents).toBeNull();
    expect(s.payoutCents).toBeNull();
  });

  it("subtracts the real fee when every counted order has one", () => {
    const a = order(5000, "paid", "2026-07-01T00:00:00Z");
    const b = order(3000, "paid", "2026-07-02T00:00:00Z");
    const s = earningsSummary([a, b], feesFor([a, b]));
    expect(s.ordersWithoutFeeRecord).toBe(0);
    expect(s.commissionCents).toBe(800);
    expect(s.netCents).toBe(8000);
    expect(s.payoutCents).toBe(7200);
  });

  it("does not charge commission on a refunded order", () => {
    // refundConnectOptions passes refund_application_fee, so the commission
    // comes back with the sale. Counting it would understate the payout.
    const kept = order(5000, "paid", "2026-07-01T00:00:00Z");
    const gone = order(4000, "refunded", "2026-07-02T00:00:00Z");
    const s = earningsSummary([kept, gone], feesFor([kept, gone]));
    expect(s.commissionCents).toBe(500);
    expect(s.netCents).toBe(5000);
    expect(s.payoutCents).toBe(4500);
  });
});

describe("gross and items no longer disagree silently", () => {
  it("names the shipping that grossCents includes and topProducts does not", () => {
    // The bug: grossCents summed total_cents (goods + shipping) while
    // topProducts summed the lines (goods only), so the same page differed by
    // exactly the shipping take with nothing on it saying so.
    const o = {
      ...order(4499, "paid", "2026-07-01T00:00:00Z", [
        { title: "Icon", unit_price_cents: 4000, quantity: 1 },
      ]),
      items_total_cents: 4000,
    };
    const s = earningsSummary([o]);
    expect(s.grossCents).toBe(4499);
    expect(s.itemsGrossCents).toBe(4000);
    expect(s.shippingCents).toBe(499);
    // The reconciliation that used to be impossible.
    expect(topProducts([o])[0].grossCents).toBe(s.itemsGrossCents);
  });

  it("falls back to the item lines when items_total_cents was never selected", () => {
    const o = order(4000, "paid", "2026-07-01T00:00:00Z", [
      { title: "Icon", unit_price_cents: 2000, quantity: 2 },
    ]);
    const s = earningsSummary([o]);
    expect(s.itemsGrossCents).toBe(4000);
    expect(s.shippingCents).toBe(0);
  });
});
