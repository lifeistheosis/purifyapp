// Buyer-side order-list rules, extracted from the orders UI so the
// phantom-order guarantees (Beta 1.9.2) are enforced by unit tests rather
// than only by component code: an order exists from the moment checkout
// STARTS, so unpaid rows must never present as purchases.

import type { ShopOrder } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

type OrderLike = Pick<ShopOrder, "payment_status" | "created_at">;

/** An unfinished checkout the buyer walked away from mid-payment. */
export function isUnfinishedCheckout(o: OrderLike): boolean {
  return o.payment_status === "pending";
}

/**
 * A row that has no business in the buyer's list at all: a cancelled
 * checkout (never paid) or a pending one gone stale past a day.
 */
export function isHiddenOrder(o: OrderLike, now: number = Date.now()): boolean {
  if (o.payment_status === "cancelled") return true;
  return (
    o.payment_status === "pending" &&
    now - new Date(o.created_at).getTime() > DAY_MS
  );
}
