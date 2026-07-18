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
