import { describe, expect, it } from "vitest";

import { isHiddenOrder, isUnfinishedCheckout } from "@/lib/shop/orders";

// The phantom-order guarantee (Beta 1.9.2): an order row exists from the
// moment checkout STARTS, so an unpaid row must never present as a purchase.
// These rules decide what the buyer's order list shows.

const NOW = Date.parse("2026-07-11T12:00:00Z");
const HOURS = 60 * 60 * 1000;

type PaymentStatus = "pending" | "paid" | "refunded" | "cancelled";

function order(payment_status: PaymentStatus, ageHours: number) {
  return {
    payment_status,
    created_at: new Date(NOW - ageHours * HOURS).toISOString(),
  };
}

describe("isUnfinishedCheckout", () => {
  it("marks only pending (unpaid) orders as unfinished", () => {
    expect(isUnfinishedCheckout(order("pending", 1))).toBe(true);
    expect(isUnfinishedCheckout(order("paid", 1))).toBe(false);
    expect(isUnfinishedCheckout(order("refunded", 1))).toBe(false);
    expect(isUnfinishedCheckout(order("cancelled", 1))).toBe(false);
  });
});

describe("isHiddenOrder", () => {
  it("hides cancelled checkouts entirely, at any age", () => {
    expect(isHiddenOrder(order("cancelled", 0), NOW)).toBe(true);
    expect(isHiddenOrder(order("cancelled", 100), NOW)).toBe(true);
  });

  it("hides pending checkouts once stale past a day", () => {
    expect(isHiddenOrder(order("pending", 23), NOW)).toBe(false);
    expect(isHiddenOrder(order("pending", 25), NOW)).toBe(true);
  });

  it("never hides paid or refunded orders", () => {
    expect(isHiddenOrder(order("paid", 1000), NOW)).toBe(false);
    expect(isHiddenOrder(order("refunded", 1000), NOW)).toBe(false);
  });

  it("a fresh pending order is visible AND partitioned as unfinished, never as a purchase", () => {
    const o = order("pending", 2);
    expect(isHiddenOrder(o, NOW)).toBe(false);
    expect(isUnfinishedCheckout(o)).toBe(true);
  });
});
