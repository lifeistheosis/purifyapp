/**
 * Partial refunds, which leave an order marked paid.
 *
 * THE GAP THIS CLOSES (found 2026-11-09, reading the revenue figures after
 * the owner's word that they "aren't correctly set up"). A refund of the whole
 * order flips it to payment_status 'refunded' (lib/shop/refundExecution.ts,
 * flipOrderRefunded), and every revenue figure reads that and counts the order
 * as nothing. A refund of PART of an order does not flip it, rightly, since
 * the rest was kept. But the amount that went back lives only on the refund
 * request (shop_refund_requests, status 'processed', amount_cents), and no
 * revenue figure read it, so a $40 order refunded $15 went on counting $40 on
 * Home, in Money, in Revenue's shop net, on the calendar and on the investor
 * page.
 *
 * Here: the refunds that went through, summed per order, and what an order
 * still holds after them. A processed request with no amount recorded is read
 * as the whole order, which is what the refund code itself assumes when a
 * request names no amount (requestedAmountCents), and is the safe direction:
 * it can only lower a revenue figure.
 *
 * The refund is taken off the ORDER, on the order's own day, the way a whole
 * refund already was. Stripe's ledger books a refund on the day it happens;
 * the two agree over any span that holds both days.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type RefundsByOrder = ReadonlyMap<string, number>;

export type KeepableOrder = {
  id?: string | null;
  total_cents: number;
  payment_status: string;
};

/**
 * What an order still holds after its refunds, in cents: a paid order its
 * total less what went back (never below zero), a refunded or unpaid one
 * nothing.
 */
export function keptCents(order: KeepableOrder, refunds?: RefundsByOrder | null): number {
  if (order.payment_status !== "paid") return 0;
  const back = order.id ? (refunds?.get(order.id) ?? 0) : 0;
  return Math.max(0, (order.total_cents ?? 0) - back);
}

/** The part of a paid order that went back, clamped to its total. Zero for any other order. */
export function partlyRefundedCents(order: KeepableOrder, refunds?: RefundsByOrder | null): number {
  if (order.payment_status !== "paid" || !order.id) return 0;
  return Math.min(Math.max(0, order.total_cents ?? 0), refunds?.get(order.id) ?? 0);
}

/**
 * Sums processed refund rows per order. Pure, so the read below and the tests
 * share it. `wholeOf` gives an order's total, for a row that recorded no
 * amount; an order it does not know contributes nothing for such a row.
 */
export function sumRefunds(
  rows: readonly { order_id: string | null; amount_cents: number | null }[],
  wholeOf: (orderId: string) => number | undefined = () => undefined,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (!r.order_id) continue;
    const amount =
      typeof r.amount_cents === "number" && Number.isFinite(r.amount_cents) && r.amount_cents > 0
        ? r.amount_cents
        : (wholeOf(r.order_id) ?? 0);
    if (amount > 0) out.set(r.order_id, (out.get(r.order_id) ?? 0) + amount);
  }
  return out;
}

/**
 * The refunds that went through for these orders, summed per order, or null
 * when they could not be read. A caller that gets null says the figure could
 * not be checked for refunds; it never reads null as "no refunds".
 *
 * Only orders still marked paid need asking (a refunded one counts nothing
 * already), so callers pass those; `totals` gives each one's total for a row
 * with no amount. In pages of a hundred ids, as the rest of the admin reads.
 */
export async function refundsByOrder(
  db: SupabaseClient,
  totals: ReadonlyMap<string, number>,
): Promise<Map<string, number> | null> {
  const ids = [...totals.keys()];
  const rows: { order_id: string | null; amount_cents: number | null }[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await db
      .from("shop_refund_requests")
      .select("order_id, amount_cents")
      .eq("status", "processed")
      .in("order_id", ids.slice(i, i + 100));
    if (error) return null;
    rows.push(...((data ?? []) as { order_id: string | null; amount_cents: number | null }[]));
  }
  return sumRefunds(rows, (id) => totals.get(id));
}

/** The paid orders among these, by id, with their totals: what refundsByOrder asks about. */
export function paidTotals(orders: readonly KeepableOrder[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const o of orders) if (o.payment_status === "paid" && o.id) out.set(o.id, o.total_cents ?? 0);
  return out;
}
