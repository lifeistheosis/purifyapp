import { describe, expect, it } from "vitest";

import { earningsSummary, monthlyEarnings, topProducts } from "../earnings";

function order(
  totalCents: number,
  paymentStatus: "pending" | "paid" | "refunded" | "cancelled",
  createdAt: string,
  items: { title: string; unit_price_cents: number; quantity: number; product_id?: string | null }[] = [
    { title: "Icon", unit_price_cents: totalCents, quantity: 1 },
  ],
) {
  return {
    total_cents: totalCents,
    payment_status: paymentStatus,
    created_at: createdAt,
    items: items.map((i) => ({ product_id: null, ...i })),
  };
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
