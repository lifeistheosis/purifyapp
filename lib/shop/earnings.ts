import type { ShopSellerOrder } from "./types";

/**
 * Earnings math for the seller console. Pure and synchronous: the caller
 * fetches the seller's orders (RLS-scoped) and this module turns them into the
 * numbers the dashboard shows. Deliberately plain vocabulary and no projected
 * or annualized figures: the console reports what actually happened.
 *
 * ── Two things this file used to get wrong ──────────────────────────────
 *
 * 1. netCents was documented as "what the seller actually keeps before fees"
 *    and no fee was ever subtracted, because until Stripe Connect landed no
 *    fee existed. The sentence described an intention. commissionCents is now
 *    a real number read from the frozen shop_order_fees row, and it is NULL
 *    rather than 0 when any counted order has no such row: an order charged
 *    before Connect kept nothing from the seller, but its money is sitting in
 *    Purify's balance awaiting a manual transfer, and printing a confident
 *    "$0.00 in fees" beside it would be the same class of lie.
 *
 * 2. grossCents summed total_cents, which INCLUDES shipping, while
 *    topProducts summed unit_price_cents * quantity, which does not. The same
 *    page therefore disagreed with itself by exactly the shipping take, with
 *    no label anywhere saying which figure was which. Both numbers are still
 *    here and are now both named: grossCents is what buyers paid,
 *    itemsGrossCents is what the goods came to, and shippingCents is the gap.
 *    topProducts reconciles against itemsGrossCents.
 *
 * All amounts are integer cents in the order's currency (single-currency
 * catalog in this phase).
 */

export type EarningsSummary = {
  /** What buyers paid on counted orders: goods plus shipping. */
  grossCents: number;
  /** The goods alone. This is the figure topProducts sums to. */
  itemsGrossCents: number;
  /** grossCents - itemsGrossCents. The seller's, because they ship. */
  shippingCents: number;
  /** Totals of orders whose payment_status ended refunded. */
  refundedCents: number;
  /** gross - refunded. What the sale was worth, before Purify's commission. */
  netCents: number;
  /**
   * Purify's commission across counted, non-refunded orders. Null when any
   * such order has no recorded fee, because the total would be understated
   * and there is no honest way to say by how much.
   */
  commissionCents: number | null;
  /** netCents - commissionCents. Null for the same reason. */
  payoutCents: number | null;
  /** Counted orders carrying no fee row. Non-zero is why the two above are null. */
  ordersWithoutFeeRecord: number;
  paidOrderCount: number;
  refundedOrderCount: number;
  unitsSold: number;
  /** Net average order value across paid, non-refunded orders. */
  averageOrderCents: number;
  /** Refunded orders / paid orders, 0..1. */
  refundRate: number;
};

export type MonthlyEarnings = {
  /** "2026-07" */
  month: string;
  grossCents: number;
  refundedCents: number;
  netCents: number;
  orderCount: number;
};

export type TopProduct = {
  title: string;
  units: number;
  grossCents: number;
};

type EarningsOrder = Pick<
  ShopSellerOrder,
  "id" | "total_cents" | "payment_status" | "created_at" | "items"
> & {
  /** Optional so callers that never selected it still typecheck. */
  items_total_cents?: number;
};

/** What Purify took on one order, keyed by order id. Absent = never recorded. */
export type FeeLookup = {
  get(orderId: string): { application_fee_cents: number } | undefined;
};

function isCounted(o: EarningsOrder): boolean {
  return o.payment_status === "paid" || o.payment_status === "refunded";
}

/**
 * The goods total for one order. Prefers the stored column and falls back to
 * summing the lines, which is what topProducts does, so the two can never
 * disagree even on an order whose items_total_cents was never selected.
 */
function itemsTotal(o: EarningsOrder): number {
  if (typeof o.items_total_cents === "number") return o.items_total_cents;
  return o.items.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0);
}

export function earningsSummary(
  orders: EarningsOrder[],
  fees?: FeeLookup,
): EarningsSummary {
  let gross = 0;
  let items = 0;
  let refunded = 0;
  let paidCount = 0;
  let refundedCount = 0;
  let units = 0;
  let commission = 0;
  let missingFee = 0;

  for (const o of orders) {
    if (!isCounted(o)) continue;
    gross += o.total_cents;
    items += itemsTotal(o);
    paidCount += 1;
    for (const item of o.items) units += item.quantity;
    if (o.payment_status === "refunded") {
      refunded += o.total_cents;
      refundedCount += 1;
      // A refunded order returns its commission too (refundConnectOptions
      // passes refund_application_fee), so it contributes nothing either way.
      continue;
    }
    const fee = fees?.get(o.id);
    if (fee) commission += fee.application_fee_cents;
    else missingFee += 1;
  }

  const keptCount = paidCount - refundedCount;
  const net = gross - refunded;
  // Unknown, not zero. See the header.
  const commissionKnown = fees != null && missingFee === 0;
  return {
    grossCents: gross,
    itemsGrossCents: items,
    shippingCents: Math.max(0, gross - items),
    refundedCents: refunded,
    netCents: net,
    commissionCents: commissionKnown ? commission : null,
    payoutCents: commissionKnown ? Math.max(0, net - commission) : null,
    ordersWithoutFeeRecord: missingFee,
    paidOrderCount: paidCount,
    refundedOrderCount: refundedCount,
    unitsSold: units,
    averageOrderCents: keptCount > 0 ? Math.round(net / keptCount) : 0,
    refundRate: paidCount > 0 ? refundedCount / paidCount : 0,
  };
}

/** Newest month first. Months with no counted orders don't appear. */
export function monthlyEarnings(orders: EarningsOrder[]): MonthlyEarnings[] {
  const byMonth = new Map<string, MonthlyEarnings>();
  for (const o of orders) {
    if (!isCounted(o)) continue;
    const month = o.created_at.slice(0, 7);
    let row = byMonth.get(month);
    if (!row) {
      row = { month, grossCents: 0, refundedCents: 0, netCents: 0, orderCount: 0 };
      byMonth.set(month, row);
    }
    row.grossCents += o.total_cents;
    row.orderCount += 1;
    if (o.payment_status === "refunded") row.refundedCents += o.total_cents;
    row.netCents = row.grossCents - row.refundedCents;
  }
  return [...byMonth.values()].sort((a, b) => (a.month < b.month ? 1 : -1));
}

/** By gross across paid orders (refunded orders excluded entirely:
 * a refunded item is not a top seller). */
export function topProducts(orders: EarningsOrder[], limit = 5): TopProduct[] {
  const byTitle = new Map<string, TopProduct>();
  for (const o of orders) {
    if (o.payment_status !== "paid") continue;
    for (const item of o.items) {
      let row = byTitle.get(item.title);
      if (!row) {
        row = { title: item.title, units: 0, grossCents: 0 };
        byTitle.set(item.title, row);
      }
      row.units += item.quantity;
      row.grossCents += item.unit_price_cents * item.quantity;
    }
  }
  return [...byTitle.values()]
    .sort((a, b) => b.grossCents - a.grossCents)
    .slice(0, limit);
}
