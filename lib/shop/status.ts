import type { ShopFulfillmentStatus, ShopOrder } from "./types";

/**
 * Buyer-facing order status vocabulary. The internal pipeline tracks
 * EIKON's two-stage fulfillment (supplier orders, inbound legs,
 * inspection, repackaging); none of that operational detail belongs in
 * a buyer's order view, so everything maps into five calm words plus
 * the two terminal exceptions.
 */
export type BuyerOrderStatus =
  | "Order Confirmed"
  | "Preparing Your Order"
  | "Ready to Ship"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Refunded";

const BUYER_STATUS: Record<ShopFulfillmentStatus, BuyerOrderStatus> = {
  pending: "Order Confirmed",
  supplier_order_needed: "Preparing Your Order",
  supplier_order_placed: "Preparing Your Order",
  inbound_to_eikon: "Preparing Your Order",
  received_for_inspection: "Preparing Your Order",
  packaged: "Ready to Ship",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function buyerOrderStatus(order: Pick<ShopOrder, "payment_status" | "fulfillment_status">): BuyerOrderStatus {
  if (order.payment_status === "refunded") return "Refunded";
  if (order.payment_status === "cancelled") return "Cancelled";
  return BUYER_STATUS[order.fulfillment_status];
}

/** Ordered steps for the buyer's order timeline. */
export const BUYER_ORDER_STEPS: BuyerOrderStatus[] = [
  "Order Confirmed",
  "Preparing Your Order",
  "Ready to Ship",
  "Shipped",
  "Delivered",
];

/** Index into BUYER_ORDER_STEPS, or -1 for terminal exception states. */
export function buyerStepIndex(status: BuyerOrderStatus): number {
  return BUYER_ORDER_STEPS.indexOf(status);
}
