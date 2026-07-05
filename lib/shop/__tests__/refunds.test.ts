import { describe, expect, it } from "vitest";

import {
  canRequestRefund,
  REFUND_REASON_LABELS,
  REFUND_STATUS_LABELS,
  refundCanTransition,
  refundIsActive,
} from "../refunds";
import type { ShopRefundStatus } from "../types";

const ALL_STATUSES: ShopRefundStatus[] = [
  "requested",
  "approved",
  "declined",
  "processed",
  "cancelled",
];

describe("canRequestRefund", () => {
  it("allows exactly one live request on a paid order", () => {
    expect(canRequestRefund("paid", null)).toBe(true);
    expect(canRequestRefund("paid", "declined")).toBe(true);
    expect(canRequestRefund("paid", "cancelled")).toBe(true);
    expect(canRequestRefund("paid", "requested")).toBe(false);
    expect(canRequestRefund("paid", "approved")).toBe(false);
  });

  it("refuses unpaid and already-resolved orders", () => {
    expect(canRequestRefund("pending", null)).toBe(false);
    expect(canRequestRefund("refunded", null)).toBe(false);
    expect(canRequestRefund("cancelled", null)).toBe(false);
  });

  it("a processed request doesn't block by itself (the order's refunded status does)", () => {
    // Edge: partial-refund futures. Today the order flips refunded when
    // processed, so payment_status is the real gate.
    expect(canRequestRefund("paid", "processed")).toBe(true);
    expect(canRequestRefund("refunded", "processed")).toBe(false);
  });
});

describe("refund transitions", () => {
  it("buyers may only withdraw their own pending request", () => {
    expect(refundCanTransition("buyer", "requested", "cancelled")).toBe(true);
    expect(refundCanTransition("buyer", "approved", "cancelled")).toBe(false);
    expect(refundCanTransition("buyer", "requested", "approved")).toBe(false);
    expect(refundCanTransition("buyer", "requested", "processed")).toBe(false);
  });

  it("sellers decide pending requests and nothing else", () => {
    expect(refundCanTransition("seller", "requested", "approved")).toBe(true);
    expect(refundCanTransition("seller", "requested", "declined")).toBe(true);
    expect(refundCanTransition("seller", "declined", "approved")).toBe(false);
    expect(refundCanTransition("seller", "processed", "declined")).toBe(false);
    expect(refundCanTransition("seller", "requested", "processed")).toBe(false);
  });
});

describe("labels and activity", () => {
  it("every status and reason has a human label", () => {
    for (const s of ALL_STATUSES) expect(REFUND_STATUS_LABELS[s]).toBeTruthy();
    for (const label of Object.values(REFUND_REASON_LABELS)) {
      expect(label).toBeTruthy();
    }
  });

  it("active means awaiting someone", () => {
    expect(refundIsActive("requested")).toBe(true);
    expect(refundIsActive("approved")).toBe(true);
    expect(refundIsActive("declined")).toBe(false);
    expect(refundIsActive("processed")).toBe(false);
    expect(refundIsActive("cancelled")).toBe(false);
  });
});
