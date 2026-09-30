/**
 * Where each group of customers' money went after their first order: net
 * revenue retention by the month they first bought, and what a customer is
 * worth against what it cost to find them (asked for 2026-09-30).
 *
 * Computed from the orders themselves rather than kept by triggers. Every
 * figure below is already a fact in shop_orders, shop_order_items and
 * shop_refund_requests, so a second ledger written by triggers would be a copy
 * that can drift from its source, and a migration merged to main runs DDL
 * against production (AGENTS.md). Pure: the rows are inputs.
 *
 * ── The four movements, per cohort ──────────────────────────────────────
 *
 *   BASELINE     the first order that took money, per customer.
 *   EXPANSION    every later order by the same customers: they came back.
 *   CONTRACTION  money given back without losing the order: a processed
 *                partial refund, or a cart deal's discount off list price.
 *   CHURN        an order refunded in full.
 *
 *   NRR = (baseline + expansion - contraction - churn) / baseline
 *
 * A customer is an account: checkout needs one, so every paid order has a
 * user_id. What the order bump and the follow-up add is not told apart from
 * any other line, because an order line does not record how it got into the
 * cart; a returning order counts as expansion whatever brought it.
 */

export type RetentionOrder = {
  id: string;
  user_id: string | null;
  total_cents: number;
  payment_status: "pending" | "paid" | "refunded" | "cancelled";
  created_at: string;
  items?: { quantity: number; unit_price_cents: number; list_price_cents?: number | null; discount_kind?: string | null }[];
};

export type RetentionRefund = { order_id: string; amount_cents: number | null; status: string };

export type Cohort = {
  /** YYYY-MM of the customers' first order. */
  month: string;
  customers: number;
  baselineCents: number;
  expansionCents: number;
  contractionCents: number;
  churnCents: number;
  /** 0..n, 1 is 100%. Null with no baseline. */
  nrr: number | null;
};

const took = (o: RetentionOrder) => o.payment_status === "paid" || o.payment_status === "refunded";

function dealDiscount(o: RetentionOrder): number {
  let off = 0;
  for (const i of o.items ?? []) {
    if (i.discount_kind === "cart_deal" && typeof i.list_price_cents === "number" && i.list_price_cents > i.unit_price_cents) {
      off += (i.list_price_cents - i.unit_price_cents) * i.quantity;
    }
  }
  return off;
}

export function cohorts(orders: RetentionOrder[], refunds: RetentionRefund[]): { cohorts: Cohort[]; overall: Cohort | null } {
  const partial = new Map<string, number>();
  for (const r of refunds) {
    if (r.status !== "processed" || !r.amount_cents) continue;
    partial.set(r.order_id, (partial.get(r.order_id) ?? 0) + r.amount_cents);
  }

  const byUser = new Map<string, RetentionOrder[]>();
  for (const o of orders) {
    if (!took(o) || !o.user_id) continue;
    const list = byUser.get(o.user_id) ?? [];
    list.push(o);
    byUser.set(o.user_id, list);
  }

  const table = new Map<string, Cohort>();
  for (const list of byUser.values()) {
    list.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    const month = list[0].created_at.slice(0, 7);
    const c =
      table.get(month) ??
      { month, customers: 0, baselineCents: 0, expansionCents: 0, contractionCents: 0, churnCents: 0, nrr: null };
    c.customers += 1;
    list.forEach((o, i) => {
      if (i === 0) c.baselineCents += o.total_cents;
      else c.expansionCents += o.total_cents;
      if (o.payment_status === "refunded") {
        c.churnCents += o.total_cents;
      } else {
        // A partial refund never exceeds what the order took.
        c.contractionCents += Math.min(o.total_cents, partial.get(o.id) ?? 0) + dealDiscount(o);
      }
    });
    table.set(month, c);
  }

  const out = [...table.values()].sort((a, b) => a.month.localeCompare(b.month));
  for (const c of out) c.nrr = nrrOf(c);
  if (out.length === 0) return { cohorts: [], overall: null };
  const overall: Cohort = out.reduce(
    (a, c) => ({
      month: "all",
      customers: a.customers + c.customers,
      baselineCents: a.baselineCents + c.baselineCents,
      expansionCents: a.expansionCents + c.expansionCents,
      contractionCents: a.contractionCents + c.contractionCents,
      churnCents: a.churnCents + c.churnCents,
      nrr: null,
    }),
    { month: "all", customers: 0, baselineCents: 0, expansionCents: 0, contractionCents: 0, churnCents: 0, nrr: null } as Cohort,
  );
  overall.nrr = nrrOf(overall);
  return { cohorts: out, overall };
}

function nrrOf(c: Cohort): number | null {
  if (c.baselineCents <= 0) return null;
  return (c.baselineCents + c.expansionCents - c.contractionCents - c.churnCents) / c.baselineCents;
}

/** Expense categories that count as finding customers. */
export const ACQUISITION_CATEGORY = /\b(ads?|advert\w*|marketing|promotion|sponsor\w*|influencer\w*)\b/i;

export type Expense = { monthly_cents: number | null; category: string | null; active: boolean | null };

export type UnitEconomics = {
  customers: number;
  /** Net revenue per customer so far: revenue, not profit. */
  ltvCents: number | null;
  /** Monthly spend on finding customers, from Costs lines tagged as ads or marketing. */
  acquisitionMonthlyCents: number;
  /** Customers whose first order fell in the last 30 days. */
  newCustomers30d: number;
  /** acquisition spend / new customers, over the last 30 days. Null when either is zero. */
  cacCents: number | null;
  /** ltv / cac. Null when either is unknown. */
  ratio: number | null;
};

export function unitEconomics(orders: RetentionOrder[], expenses: Expense[], now: number): UnitEconomics {
  const firsts = new Map<string, number>();
  const net = new Map<string, number>();
  for (const o of orders) {
    if (!took(o) || !o.user_id) continue;
    const at = Date.parse(o.created_at);
    firsts.set(o.user_id, Math.min(firsts.get(o.user_id) ?? Infinity, at));
    net.set(o.user_id, (net.get(o.user_id) ?? 0) + (o.payment_status === "refunded" ? 0 : o.total_cents));
  }
  const customers = firsts.size;
  const revenue = [...net.values()].reduce((a, b) => a + b, 0);
  const newCustomers30d = [...firsts.values()].filter((t) => now - t <= 30 * 86_400_000).length;
  const acquisitionMonthlyCents = expenses
    .filter((e) => e.active !== false && e.category && ACQUISITION_CATEGORY.test(e.category))
    .reduce((a, e) => a + (e.monthly_cents ?? 0), 0);
  const ltvCents = customers > 0 ? Math.round(revenue / customers) : null;
  const cacCents = acquisitionMonthlyCents > 0 && newCustomers30d > 0 ? Math.round(acquisitionMonthlyCents / newCustomers30d) : null;
  return {
    customers,
    ltvCents,
    acquisitionMonthlyCents,
    newCustomers30d,
    cacCents,
    ratio: ltvCents != null && cacCents != null && cacCents > 0 ? ltvCents / cacCents : null,
  };
}
