// The verified-buyer rule, in one place. The DATABASE is authoritative: the
// shop_submit_review RPC (supabase/migrations/20260711_shop_reviews.sql) refuses
// any review from a user without a PAID order containing the product. This pure
// predicate mirrors that rule for the client's "can I review?" gate and is
// unit-tested alongside it, so the two can't silently drift.

export type PurchasedOrder = {
  payment_status: string;
  product_ids: (string | null)[];
};

/** True when these orders include a PAID order containing the product — the
 *  exact condition shop_submit_review enforces in SQL. */
export function isVerifiedBuyer(
  orders: PurchasedOrder[],
  productId: string,
): boolean {
  return orders.some(
    (o) => o.payment_status === "paid" && o.product_ids.includes(productId),
  );
}
