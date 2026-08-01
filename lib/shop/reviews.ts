// The verified-buyer rule, in one place. The DATABASE is authoritative: the
// shop_submit_review RPC (supabase/migrations/20260718_shop_reviews_v2.sql)
// refuses any review from a user without a PAID + DELIVERED order containing the
// product. This pure predicate mirrors that rule for the client's "can I
// review?" gate and is unit-tested alongside it, so the two can't silently drift.

export type PurchasedOrder = {
  payment_status: string;
  fulfillment_status: string;
  product_ids: (string | null)[];
};

/** True when these orders include a PAID + DELIVERED order containing the
 *  product — the exact condition shop_submit_review enforces in SQL. Arrival
 *  (the order marked delivered) is the review-eligibility signal, not payment. */
export function isVerifiedBuyer(
  orders: PurchasedOrder[],
  productId: string,
): boolean {
  return orders.some(
    (o) =>
      o.payment_status === "paid" &&
      o.fulfillment_status === "delivered" &&
      o.product_ids.includes(productId),
  );
}

/** True when the caller has a PAID + DELIVERED order from this store — the
 *  condition shop_submit_store_review enforces for store-level reviews. */
export function hasDeliveredFromStore(
  orders: { payment_status: string; fulfillment_status: string }[],
): boolean {
  return orders.some(
    (o) => o.payment_status === "paid" && o.fulfillment_status === "delivered",
  );
}

/**
 * Whether a review that is ALREADY published may display the
 * "Verified buyer" badge.
 *
 * This is a display rule, separate from the two write rules above, because
 * not every stored review went through them: the admin seeding route
 * inserts rows directly with `order_id` null, bypassing the delivered-order
 * gate in SQL. Both review surfaces rendered the badge unconditionally on
 * the assumption that every stored row had earned it, so seeded rows were
 * shown to shoppers as verified purchases. The product page was corrected;
 * the store page was not, until now.
 *
 * A null `order_id` is treated as unverified even though it can also mean a
 * real order was later deleted (the column is ON DELETE SET NULL). Claiming
 * a purchase we cannot evidence is the failure that matters here.
 */
export function wearsVerifiedBadge(review: {
  order_id?: string | null;
}): boolean {
  return typeof review.order_id === "string" && review.order_id.length > 0;
}
