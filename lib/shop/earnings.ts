import type { ShopSellerOrder } from "./types";

/**
 * Earnings math for the seller console. Pure and synchronous: the
 * caller fetches the seller's orders (RLS-scoped) and this module
 * turns them into the numbers the dashboard shows. Deliberately plain
 * vocabulary — "gross", "refunded", "net" — and no projected or
 * annualized figures: the console reports what actually happened.
 *
 * All amounts are integer cents in the order's currency (single-currency
 * catalog in this phase).
 */

export type EarningsSummary = {
  /** Paid orders' totals, including those later refunded. */
  grossCents: number;
  /** Totals of orders whose payment_status ended refunded. */
  refundedCents: number;
  /** gross - refunded: what the seller actually keeps before fees. */
  netCents: number;
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
  "total_cents" | "payment_status" | "created_at" | "items"
>;

function isCounted(o: EarningsOrder): boolean {
  return o.payment_status === "paid" || o.payment_status === "refunded";
}

export function earningsSummary(orders: EarningsOrder[]): EarningsSummary {
  let gross = 0;
  let refunded = 0;
  let paidCount = 0;
  let refundedCount = 0;
  let units = 0;

  for (const o of orders) {
    if (!isCounted(o)) continue;
    gross += o.total_cents;
    paidCount += 1;
    for (const item of o.items) units += item.quantity;
    if (o.payment_status === "refunded") {
      refunded += o.total_cents;
      refundedCount += 1;
    }
  }

  const keptCount = paidCount - refundedCount;
  const net = gross - refunded;
  return {
    grossCents: gross,
    refundedCents: refunded,
    netCents: net,
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
