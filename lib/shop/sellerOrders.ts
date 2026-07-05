import type { ShopFulfillmentStatus } from "./types";

/**
 * What a seller may do to an order's fulfillment status from the
 * console. Pure data so the API route and the UI enforce the same
 * rules and the tests can cover every edge.
 *
 * Sellers move orders forward through the simple chain and may cancel
 * only before anything ships. The supplier-pipeline stages
 * (supplier_order_*, inbound, inspection) belong to EIKON's admin
 * tooling, not the console: a seller sees them, labeled, but the only
 * transition offered out of them is "packaged" — i.e. "it's ready".
 * Terminal states (delivered, cancelled, refunded) offer nothing.
 * Refunds NEVER go through this map; they flow through the refund
 * pipeline so money and status can't diverge.
 */
export const SELLER_TRANSITIONS: Record<
  ShopFulfillmentStatus,
  ShopFulfillmentStatus[]
> = {
  pending: ["packaged", "cancelled"],
  supplier_order_needed: ["packaged", "cancelled"],
  supplier_order_placed: ["packaged"],
  inbound_to_eikon: ["packaged"],
  received_for_inspection: ["packaged"],
  packaged: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: [],
};

export function sellerCanTransition(
  from: ShopFulfillmentStatus,
  to: ShopFulfillmentStatus,
): boolean {
  return SELLER_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Marking shipped without a tracking number is how "where is my
 * order?" messages are born; the console requires one. */
export function transitionNeedsTracking(to: ShopFulfillmentStatus): boolean {
  return to === "shipped";
}

/** Seller-facing labels: operational, but still plain words. */
export const SELLER_STATUS_LABELS: Record<ShopFulfillmentStatus, string> = {
  pending: "New order",
  supplier_order_needed: "Awaiting sourcing",
  supplier_order_placed: "Sourcing in progress",
  inbound_to_eikon: "Inbound",
  received_for_inspection: "In inspection",
  packaged: "Packaged",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** Buttons the console renders for a given state, in display order. */
export const SELLER_ACTION_LABELS: Partial<
  Record<ShopFulfillmentStatus, string>
> = {
  packaged: "Mark packaged",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

/** Orders that still need the seller to act. */
export function needsSellerAction(status: ShopFulfillmentStatus): boolean {
  return (
    status === "pending" ||
    status === "supplier_order_needed" ||
    status === "packaged"
  );
}
