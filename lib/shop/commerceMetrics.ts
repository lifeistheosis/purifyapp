import { ABANDON_AFTER_MS } from "./abandonedCheckouts";

/**
 * Two numbers the owner asked for that the revenue panel could not give
 * (2026-09-30): the average order split between EIKON and the marketplace,
 * and how many checkouts are walked away from and how many of those people
 * come back and buy anyway.
 *
 * Pure: the orders, the set of EIKON's own stores and the clock are inputs,
 * so the panel and the tests count the same way.
 *
 * ── Which orders count ──────────────────────────────────────────────────
 *
 * The average order uses the same rule as lib/shop/earnings.ts: an order that
 * was paid and is still paid. A refunded order is not an order anyone kept, and
 * counting it would let one refund inflate the average it was taken from.
 *
 * A checkout is a row in shop_orders: checkout writes it before Stripe opens.
 * One is ABANDONED once it is past Stripe's own session life plus a margin
 * (ABANDON_AFTER_MS, the same line the sweep uses) and still unpaid, or once
 * the sweep has cancelled it. A younger unpaid row is still somebody's open
 * payment page and is left out of both sides of the rate, so a busy evening
 * never reads as a spike of abandonment.
 */

export type MetricsOrder = {
  id: string;
  user_id: string | null;
  store_id: string | null;
  total_cents: number;
  payment_status: "pending" | "paid" | "refunded" | "cancelled";
  created_at: string;
};

export type AovGroup = { orders: number; cents: number; aovCents: number };

export type AovSplit = { all: AovGroup; eikon: AovGroup; marketplace: AovGroup };

function group(orders: MetricsOrder[]): AovGroup {
  const cents = orders.reduce((sum, o) => sum + o.total_cents, 0);
  return { orders: orders.length, cents, aovCents: orders.length > 0 ? Math.round(cents / orders.length) : 0 };
}

/** Average order, kept orders only, for the whole shop and each half of it. */
export function aovSplit(orders: MetricsOrder[], eikonStoreIds: ReadonlySet<string>): AovSplit {
  const kept = orders.filter((o) => o.payment_status === "paid");
  const eikon = kept.filter((o) => o.store_id != null && eikonStoreIds.has(o.store_id));
  const marketplace = kept.filter((o) => o.store_id == null || !eikonStoreIds.has(o.store_id));
  return { all: group(kept), eikon: group(eikon), marketplace: group(marketplace) };
}

/** A walked-away checkout is recovered when the same account pays within this. */
export const RECOVERY_WINDOW_MS = 7 * 86_400_000;

export type AbandonmentStats = {
  /** Checkouts old enough to have an answer: paid, refunded or abandoned. */
  decided: number;
  abandoned: number;
  converted: number;
  /** abandoned / decided, 0..1. Null with nothing decided: unknown, not zero. */
  abandonmentRate: number | null;
  /** Abandoned checkouts whose account paid for an order within a week. */
  recovered: number;
  /** recovered / abandoned, 0..1. Null with nothing abandoned. */
  recoveryRate: number | null;
  /** Unpaid and still inside Stripe's session life: counted nowhere yet. */
  open: number;
};

export function isAbandoned(o: MetricsOrder, now: number): boolean {
  if (o.payment_status === "cancelled") return true;
  if (o.payment_status !== "pending") return false;
  return now - Date.parse(o.created_at) > ABANDON_AFTER_MS;
}

export function abandonmentStats(orders: MetricsOrder[], now: number): AbandonmentStats {
  let abandoned = 0;
  let converted = 0;
  let open = 0;
  let recovered = 0;

  // Paid orders by account, for the recovery look-up.
  const paidAt = new Map<string, number[]>();
  for (const o of orders) {
    if ((o.payment_status === "paid" || o.payment_status === "refunded") && o.user_id) {
      const list = paidAt.get(o.user_id) ?? [];
      list.push(Date.parse(o.created_at));
      paidAt.set(o.user_id, list);
    }
  }

  for (const o of orders) {
    if (o.payment_status === "paid" || o.payment_status === "refunded") {
      converted += 1;
      continue;
    }
    if (!isAbandoned(o, now)) {
      open += 1;
      continue;
    }
    abandoned += 1;
    if (!o.user_id) continue;
    const at = Date.parse(o.created_at);
    const later = paidAt.get(o.user_id) ?? [];
    if (later.some((t) => t > at && t - at <= RECOVERY_WINDOW_MS)) recovered += 1;
  }

  const decided = abandoned + converted;
  return {
    decided,
    abandoned,
    converted,
    abandonmentRate: decided > 0 ? abandoned / decided : null,
    recovered,
    recoveryRate: abandoned > 0 ? recovered / abandoned : null,
    open,
  };
}
