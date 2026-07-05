import type { ShopRefundReason, ShopRefundStatus } from "./types";

/**
 * Refund pipeline rules, shared by the buyer routes, the seller
 * decision route, and both UIs. Pure data + predicates; the actual
 * money movement lives in the API route (Stripe when checkout is live,
 * a parked "approved" state for manual processing when it isn't).
 */

export const REFUND_REASON_LABELS: Record<ShopRefundReason, string> = {
  damaged: "Arrived damaged",
  not_as_described: "Not as described",
  never_arrived: "Never arrived",
  wrong_item: "Wrong item received",
  change_of_mind: "Changed my mind",
  other: "Something else",
};

export const REFUND_STATUS_LABELS: Record<ShopRefundStatus, string> = {
  requested: "Refund requested",
  approved: "Refund approved",
  declined: "Refund declined",
  processed: "Refunded",
  cancelled: "Request withdrawn",
};

/** What each party may turn a request into. */
export const REFUND_TRANSITIONS: Record<
  "buyer" | "seller",
  Partial<Record<ShopRefundStatus, ShopRefundStatus[]>>
> = {
  buyer: { requested: ["cancelled"] },
  seller: {
    requested: ["approved", "declined"],
    // "approved" resolves to processed inside the decision route once
    // the money has actually moved; sellers never set it directly.
  },
};

export function refundCanTransition(
  actor: "buyer" | "seller",
  from: ShopRefundStatus,
  to: ShopRefundStatus,
): boolean {
  return REFUND_TRANSITIONS[actor][from]?.includes(to) ?? false;
}

/**
 * May this order accept a new refund request? Paid orders only —
 * pending orders have nothing to refund and cancelled/refunded orders
 * are already resolved. An existing live request blocks a second one
 * (the DB partial unique index enforces the same rule).
 */
export function canRequestRefund(
  paymentStatus: "pending" | "paid" | "refunded" | "cancelled",
  activeRequest: ShopRefundStatus | null,
): boolean {
  if (paymentStatus !== "paid") return false;
  return activeRequest !== "requested" && activeRequest !== "approved";
}

/** A request still awaiting someone's move. */
export function refundIsActive(status: ShopRefundStatus): boolean {
  return status === "requested" || status === "approved";
}
