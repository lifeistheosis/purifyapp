import type { ShopFulfillmentStatus } from "./types";

/**
 * What a seller may do to an order's fulfillment status from the console. Pure
 * data so the API route and the UI enforce the same rules and the tests can
 * cover every edge.
 *
 * Sellers move orders forward through the simple chain and may cancel only
 * before anything ships. The supplier-pipeline stages (supplier_order_*,
 * inbound, inspection) belong to EIKON's admin tooling, not the console: a
 * seller sees them, labeled, but the only transition offered out of them is
 * "packaged", meaning "it's ready". Terminal states (delivered, cancelled,
 * refunded) offer nothing. Refunds NEVER go through this map; they flow
 * through the refund pipeline so money and status cannot diverge.
 *
 * ── The graph is shared; the WORDS are not ─────────────────────────────
 *
 * EIKON is a partner store Purify runs closely: goods are sourced from a
 * supplier, come inbound, are inspected and repacked, then ship. An
 * independent seller ships their own goods off their own shelf, and none of
 * that happens to them. The moves available are identical either way (pack it,
 * send it, or cancel while you still can), so there is deliberately only ONE
 * transition map here; duplicating it per pipeline would be two things to keep
 * in step for no behavioural difference.
 *
 * What must differ is what the states are CALLED. "Awaiting sourcing" and
 * "In inspection" describe a warehouse an independent seller has never seen.
 * See statusLabelsFor below.
 *
 * shop_products.fulfillment_type has carried 'seller_fulfilled' as a legal
 * value since the first migration and NOTHING HAS EVER WRITTEN IT: every row
 * takes the 'eikon_two_stage' default and the column is read in exactly one
 * place, a type declaration. So the pipeline is chosen from the STORE rather
 * than from a column whose contents mean nothing. That is also the truer
 * source: who ships is a fact about the seller, not about one listing.
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

/** Which pipeline a store runs. */
export type FulfillmentPath = "eikon_two_stage" | "seller_fulfilled";

/**
 * The path for a store, from its seller type. Purify-operated stores run the
 * two-stage pipeline; everyone else ships their own.
 *
 * An UNKNOWN seller type defaults to seller_fulfilled on purpose. Getting it
 * wrong that way costs a slightly vaguer status word; getting it wrong the
 * other way prints "In inspection" over a stranger shipping from their kitchen
 * table, which is a claim Purify would be making on their behalf.
 */
export function fulfillmentPathFor(
  sellerType: string | null | undefined,
): FulfillmentPath {
  return sellerType === "purify_owned" ? "eikon_two_stage" : "seller_fulfilled";
}

/**
 * The status an order STARTS in for a given pipeline.
 *
 * A special-order line puts an EIKON order on the sourcing path, because EIKON
 * really does have to order it in. For a seller shipping their own goods there
 * is no supplier to wait on, so the order is simply new.
 */
export function initialFulfillmentStatus(
  path: FulfillmentPath,
  hasSpecialOrderLine: boolean,
): ShopFulfillmentStatus {
  if (path === "seller_fulfilled") return "pending";
  return hasSpecialOrderLine ? "supplier_order_needed" : "pending";
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

/**
 * The same states, described to somebody who ships their own goods.
 *
 * Only the four supplier stages differ, and they differ because their EIKON
 * names are claims about a warehouse this seller has never seen. An order
 * sitting in one of them is not "Inbound", it is waiting for them.
 *
 * They are reachable rather than impossible: an order taken before a store's
 * pipeline was settled can be in one, and a state with no label renders blank.
 */
export const SELLER_FULFILLED_STATUS_LABELS: Record<
  ShopFulfillmentStatus,
  string
> = {
  ...SELLER_STATUS_LABELS,
  supplier_order_needed: "New order",
  supplier_order_placed: "In progress",
  inbound_to_eikon: "In progress",
  received_for_inspection: "In progress",
};

export function statusLabelsFor(
  path: FulfillmentPath,
): Record<ShopFulfillmentStatus, string> {
  return path === "seller_fulfilled"
    ? SELLER_FULFILLED_STATUS_LABELS
    : SELLER_STATUS_LABELS;
}

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
