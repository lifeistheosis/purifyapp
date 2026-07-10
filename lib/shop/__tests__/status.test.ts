import { describe, expect, it } from "vitest";

import { buyerOrderStatus, buyerStepIndex, BUYER_ORDER_STEPS } from "../status";
import type { ShopFulfillmentStatus } from "../types";

const ALL_FULFILLMENT: ShopFulfillmentStatus[] = [
  "pending",
  "supplier_order_needed",
  "supplier_order_placed",
  "inbound_to_eikon",
  "received_for_inspection",
  "packaged",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

describe("buyerOrderStatus", () => {
  it("maps every internal status to a buyer-safe word", () => {
    for (const fs of ALL_FULFILLMENT) {
      const label = buyerOrderStatus({ payment_status: "paid", fulfillment_status: fs });
      expect(label).toBeTruthy();
    }
  });

  it("never leaks supplier stages to the buyer", () => {
    for (const fs of ALL_FULFILLMENT) {
      const label = buyerOrderStatus({
        payment_status: "paid",
        fulfillment_status: fs,
      }).toLowerCase();
      expect(label).not.toContain("supplier");
      expect(label).not.toContain("inbound");
      expect(label).not.toContain("inspection");
      expect(label).not.toContain("eikon");
    }
  });

  it("groups the whole two-stage pipeline under Preparing Your Order", () => {
    for (const fs of [
      "supplier_order_needed",
      "supplier_order_placed",
      "inbound_to_eikon",
      "received_for_inspection",
    ] as const) {
      expect(
        buyerOrderStatus({ payment_status: "paid", fulfillment_status: fs }),
      ).toBe("Preparing Your Order");
    }
  });

  it("payment status wins for refunds and cancellations", () => {
    expect(
      buyerOrderStatus({ payment_status: "refunded", fulfillment_status: "shipped" }),
    ).toBe("Refunded");
    expect(
      buyerOrderStatus({ payment_status: "cancelled", fulfillment_status: "pending" }),
    ).toBe("Cancelled");
  });
});

describe("buyer timeline", () => {
  it("orders the five steps and excludes terminal exceptions", () => {
    expect(BUYER_ORDER_STEPS).toHaveLength(5);
    expect(buyerStepIndex("Order Confirmed")).toBe(0);
    expect(buyerStepIndex("Delivered")).toBe(4);
    expect(buyerStepIndex("Cancelled")).toBe(-1);
    expect(buyerStepIndex("Refunded")).toBe(-1);
  });
});
