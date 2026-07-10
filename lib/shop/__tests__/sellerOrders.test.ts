import { describe, expect, it } from "vitest";

import {
  needsSellerAction,
  SELLER_ACTION_LABELS,
  SELLER_STATUS_LABELS,
  SELLER_TRANSITIONS,
  sellerCanTransition,
  transitionNeedsTracking,
} from "../sellerOrders";
import type { ShopFulfillmentStatus } from "../types";

const ALL: ShopFulfillmentStatus[] = [
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

describe("seller transitions", () => {
  it("covers every fulfillment status", () => {
    for (const s of ALL) {
      expect(SELLER_TRANSITIONS[s]).toBeDefined();
      expect(SELLER_STATUS_LABELS[s]).toBeTruthy();
    }
  });

  it("walks the happy path forward", () => {
    expect(sellerCanTransition("pending", "packaged")).toBe(true);
    expect(sellerCanTransition("packaged", "shipped")).toBe(true);
    expect(sellerCanTransition("shipped", "delivered")).toBe(true);
  });

  it("never moves backward or skips shipping", () => {
    expect(sellerCanTransition("shipped", "packaged")).toBe(false);
    expect(sellerCanTransition("delivered", "shipped")).toBe(false);
    expect(sellerCanTransition("pending", "delivered")).toBe(false);
    expect(sellerCanTransition("pending", "shipped")).toBe(false);
  });

  it("terminal states offer nothing", () => {
    for (const s of ["delivered", "cancelled", "refunded"] as const) {
      expect(SELLER_TRANSITIONS[s]).toHaveLength(0);
    }
  });

  it("refunded is never a seller transition target", () => {
    for (const s of ALL) {
      expect(sellerCanTransition(s, "refunded")).toBe(false);
    }
  });

  it("cancel is only offered before anything ships", () => {
    expect(sellerCanTransition("pending", "cancelled")).toBe(true);
    expect(sellerCanTransition("packaged", "cancelled")).toBe(true);
    expect(sellerCanTransition("shipped", "cancelled")).toBe(false);
    expect(sellerCanTransition("delivered", "cancelled")).toBe(false);
  });

  it("shipping requires tracking; nothing else does", () => {
    for (const s of ALL) {
      expect(transitionNeedsTracking(s)).toBe(s === "shipped");
    }
  });

  it("every offered action has a label", () => {
    const targets = new Set(Object.values(SELLER_TRANSITIONS).flat());
    for (const t of targets) {
      expect(SELLER_ACTION_LABELS[t]).toBeTruthy();
    }
  });
});

describe("needsSellerAction", () => {
  it("flags new, sourcing-needed, and packaged orders", () => {
    expect(needsSellerAction("pending")).toBe(true);
    expect(needsSellerAction("supplier_order_needed")).toBe(true);
    expect(needsSellerAction("packaged")).toBe(true);
  });

  it("leaves in-motion and terminal orders alone", () => {
    expect(needsSellerAction("shipped")).toBe(false);
    expect(needsSellerAction("delivered")).toBe(false);
    expect(needsSellerAction("refunded")).toBe(false);
  });
});
