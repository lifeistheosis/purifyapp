import { describe, expect, it } from "vitest";

import { productRating, unitsSoldLabel } from "@/lib/shop/format";
import {
  hasDeliveredFromStore,
  isVerifiedBuyer,
  wearsVerifiedBadge,
  type PurchasedOrder,
} from "@/lib/shop/reviews";

const P = "prod-1";
const OTHER = "prod-2";

describe("isVerifiedBuyer (verified-buyer review rule)", () => {
  it("allows a review when a PAID + DELIVERED order contains the product", () => {
    const orders: PurchasedOrder[] = [
      {
        payment_status: "paid",
        fulfillment_status: "delivered",
        product_ids: [OTHER, P],
      },
    ];
    expect(isVerifiedBuyer(orders, P)).toBe(true);
  });

  it("rejects a paid order that has not been delivered yet", () => {
    const orders: PurchasedOrder[] = [
      { payment_status: "paid", fulfillment_status: "shipped", product_ids: [P] },
      { payment_status: "paid", fulfillment_status: "packaged", product_ids: [P] },
    ];
    expect(isVerifiedBuyer(orders, P)).toBe(false);
  });

  it("rejects when the only order containing the product is not paid", () => {
    const orders: PurchasedOrder[] = [
      { payment_status: "pending", fulfillment_status: "pending", product_ids: [P] },
      {
        payment_status: "refunded",
        fulfillment_status: "delivered",
        product_ids: [P],
      },
    ];
    expect(isVerifiedBuyer(orders, P)).toBe(false);
  });

  it("rejects when delivered orders exist but none contain the product", () => {
    const orders: PurchasedOrder[] = [
      {
        payment_status: "paid",
        fulfillment_status: "delivered",
        product_ids: [OTHER],
      },
    ];
    expect(isVerifiedBuyer(orders, P)).toBe(false);
  });

  it("rejects with no orders at all", () => {
    expect(isVerifiedBuyer([], P)).toBe(false);
  });

  it("ignores null product ids from deleted products", () => {
    const orders: PurchasedOrder[] = [
      {
        payment_status: "paid",
        fulfillment_status: "delivered",
        product_ids: [null],
      },
    ];
    expect(isVerifiedBuyer(orders, P)).toBe(false);
  });
});

describe("hasDeliveredFromStore (store-review eligibility)", () => {
  it("allows once a paid order has been delivered", () => {
    expect(
      hasDeliveredFromStore([
        { payment_status: "paid", fulfillment_status: "delivered" },
      ]),
    ).toBe(true);
  });

  it("rejects a paid-but-undelivered order", () => {
    expect(
      hasDeliveredFromStore([
        { payment_status: "paid", fulfillment_status: "shipped" },
      ]),
    ).toBe(false);
  });

  it("rejects a delivered order that was refunded", () => {
    expect(
      hasDeliveredFromStore([
        { payment_status: "refunded", fulfillment_status: "delivered" },
      ]),
    ).toBe(false);
  });

  it("rejects with no orders", () => {
    expect(hasDeliveredFromStore([])).toBe(false);
  });
});

describe("wearsVerifiedBadge (which published reviews may claim a purchase)", () => {
  it("lets a review with a real order behind it wear the badge", () => {
    expect(wearsVerifiedBadge({ order_id: "8f0a1c2e-0000-4000-8000-000000000000" })).toBe(true);
  });

  it("refuses the badge to an operator-seeded row", () => {
    // The admin seeding route inserts with order_id null, bypassing the
    // delivered-order gate. Both review surfaces used to render the badge
    // unconditionally, so these were shown to shoppers as verified buyers.
    expect(wearsVerifiedBadge({ order_id: null })).toBe(false);
  });

  it("refuses the badge when the field is absent entirely", () => {
    // A catalog response from before order_id was selected. Absent is not
    // evidence of a purchase, so it must not read as one.
    expect(wearsVerifiedBadge({})).toBe(false);
  });

  it("refuses the badge on an empty string", () => {
    expect(wearsVerifiedBadge({ order_id: "" })).toBe(false);
  });
});

describe("productRating", () => {
  it("returns a null average with no reviews", () => {
    expect(productRating({ review_count: 0, rating_total: 0 })).toEqual({
      avg: null,
      count: 0,
    });
  });

  it("computes the average from the summed stars", () => {
    // 4 reviews summing to 18 stars → 4.5 average.
    expect(productRating({ review_count: 4, rating_total: 18 })).toEqual({
      avg: 4.5,
      count: 4,
    });
  });

  it("treats missing counters as zero", () => {
    expect(productRating({})).toEqual({ avg: null, count: 0 });
  });
});

describe("unitsSoldLabel", () => {
  it("omits at zero / undefined", () => {
    expect(unitsSoldLabel(0)).toBeNull();
    expect(unitsSoldLabel(undefined)).toBeNull();
  });

  it("labels a positive count", () => {
    expect(unitsSoldLabel(1)).toBe("1 sold");
    expect(unitsSoldLabel(24)).toBe("24 sold");
  });
});
