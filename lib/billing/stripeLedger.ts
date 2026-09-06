import "server-only";
import Stripe from "stripe";

/**
 * Everything Stripe has, as a ledger.
 *
 * WHY. The Revenue tab summed shop_orders (settled by one webhook event,
 * zero paid to date), a typed-in donations figure, and RevenueCat metrics
 * that need a key nobody set. Nothing read Stripe itself, so subscription
 * invoices billed through Stripe, refunds, fees and payouts appeared
 * nowhere. Reported by the owner 2026-09-05 as "the full Stripe logs aren't
 * showing in Revenue". They could not.
 *
 * The balance transaction list is Stripe's own ledger: one row per movement
 * of money, every type, with the fee Stripe took and the net that reached
 * the balance. This module pages through all of it, expands each row's
 * source so a charge carries its payment intent and invoice, and reduces it
 * to what the tab shows. Pure below the fetch, tested on fixture rows.
 *
 * No table. Read live, cached a minute by the route. Stripe keeps the
 * history; a snapshot table is a later choice if the panel ever needs what
 * Stripe no longer returns.
 */

export type LedgerRow = {
  id: string;
  /** ISO timestamp. */
  created: string;
  /** Stripe's type: charge, payment, refund, payout, stripe_fee, adjustment,
      application_fee, transfer, payment_refund, ... */
  type: string;
  /** Gross amount in the smallest unit, signed the way Stripe signs it. */
  amount: number;
  fee: number;
  net: number;
  currency: string;
  description: string;
  /** How the row relates to Purify's own books. */
  match: "shop-order" | "subscription" | "refund" | "payout" | "fee" | "other";
  /** The order id when a shop order matched, the invoice id for a subscription. */
  ref: string | null;
  /** Customer email when Stripe carried one. Masked by the panel's streamer mode. */
  email: string | null;
};

export type LedgerSummary = {
  chargesCents: number;
  refundsCents: number;
  feesCents: number;
  payoutsCents: number;
  netCents: number;
  /** Charges that carry a subscription invoice, net of their refunds. */
  subscriptionsCents: number;
  /** Charges matched to a shop order. */
  shopCents: number;
  /** Charges the books cannot place. A number, not a mystery. */
  unmatchedCents: number;
  unmatchedCount: number;
  count: number;
  byType: Record<string, { count: number; amount: number; net: number }>;
};

export type Ledger = {
  configured: boolean;
  /** Set when configured and the read failed. The tab shows it as one line. */
  error: string | null;
  rows: LedgerRow[];
  summary: LedgerSummary;
  fetchedAt: string;
};

export function emptySummary(): LedgerSummary {
  return {
    chargesCents: 0,
    refundsCents: 0,
    feesCents: 0,
    payoutsCents: 0,
    netCents: 0,
    subscriptionsCents: 0,
    shopCents: 0,
    unmatchedCents: 0,
    unmatchedCount: 0,
    count: 0,
    byType: {},
  };
}

type SourceLike = {
  object?: string;
  payment_intent?: string | { id: string } | null;
  invoice?: string | { id: string } | null;
  receipt_email?: string | null;
  billing_details?: { email?: string | null } | null;
  description?: string | null;
  charge?: string | { id: string; payment_intent?: string | { id: string } | null; invoice?: string | { id: string } | null } | null;
};

const idOf = (v: string | { id: string } | null | undefined): string | null =>
  !v ? null : typeof v === "string" ? v : v.id;

/**
 * One balance transaction to one ledger row. `orderByIntent` maps a Stripe
 * payment intent id to Purify's order id; that is the only join to the
 * books, and it is done here so the route stays a fetch.
 */
export function toRow(
  t: Stripe.BalanceTransaction,
  orderByIntent: ReadonlyMap<string, string>,
  invoiceByIntent: ReadonlyMap<string, string> = new Map(),
): LedgerRow {
  const src = (t.source && typeof t.source === "object" ? t.source : null) as SourceLike | null;
  // A refund's source is the refund object, whose `charge` carries the
  // intent and invoice. Reach through one level so a refunded subscription
  // still reads as a subscription movement.
  const charge = src?.object === "refund" && src.charge && typeof src.charge === "object" ? src.charge : src;
  const intent = idOf(charge?.payment_intent ?? null);
  // Older API versions put `invoice` on the charge; current ones link an
  // invoice to its payment intent instead. Accept either.
  const invoice = idOf(charge?.invoice ?? null) ?? (intent ? invoiceByIntent.get(intent) ?? null : null);
  const email = src?.receipt_email ?? src?.billing_details?.email ?? null;

  let match: LedgerRow["match"] = "other";
  let ref: string | null = null;
  if (t.type === "payout") match = "payout";
  else if (t.type === "stripe_fee" || t.type === "application_fee") match = "fee";
  else if (t.type === "refund" || t.type === "payment_refund" || t.type === "payment_failure_refund") {
    match = "refund";
    ref = invoice ?? (intent ? orderByIntent.get(intent) ?? null : null);
  } else if (t.type === "charge" || t.type === "payment") {
    if (invoice) {
      match = "subscription";
      ref = invoice;
    } else if (intent && orderByIntent.has(intent)) {
      match = "shop-order";
      ref = orderByIntent.get(intent) ?? null;
    }
  }

  return {
    id: t.id,
    created: new Date(t.created * 1000).toISOString(),
    type: t.type,
    amount: t.amount,
    fee: t.fee,
    net: t.net,
    currency: t.currency,
    description: t.description ?? src?.description ?? "",
    match,
    ref,
    email,
  };
}

export function summarise(rows: LedgerRow[]): LedgerSummary {
  const s = emptySummary();
  for (const r of rows) {
    s.count++;
    s.netCents += r.net;
    const bucket = (s.byType[r.type] ??= { count: 0, amount: 0, net: 0 });
    bucket.count++;
    bucket.amount += r.amount;
    bucket.net += r.net;

    if (r.type === "charge" || r.type === "payment") {
      s.chargesCents += r.amount;
      s.feesCents += r.fee;
      if (r.match === "subscription") s.subscriptionsCents += r.amount;
      else if (r.match === "shop-order") s.shopCents += r.amount;
      else {
        s.unmatchedCents += r.amount;
        s.unmatchedCount++;
      }
    } else if (r.match === "refund") {
      // Stripe signs refunds negative. Keep the summary positive and
      // subtract from the stream the refund belongs to.
      const abs = Math.abs(r.amount);
      s.refundsCents += abs;
      if (r.ref && r.ref.startsWith("in_")) s.subscriptionsCents -= abs;
      else if (r.ref) s.shopCents -= abs;
    } else if (r.type === "payout") {
      s.payoutsCents += Math.abs(r.amount);
    } else if (r.match === "fee") {
      s.feesCents += Math.abs(r.amount);
    }
  }
  return s;
}

/**
 * Net money by calendar month: charges and payments net of Stripe's fee,
 * minus refunds, in the order the months occurred. Payouts, fees on their
 * own rows, adjustments and transfers are movements of money already
 * counted, so they are left out. The Revenue tab draws this when Stripe is
 * the realized source.
 */
export function monthlyNet(rows: LedgerRow[]): { month: string; netCents: number; grossCents: number }[] {
  const byMonth = new Map<string, { netCents: number; grossCents: number }>();
  for (const r of rows) {
    const counts = r.type === "charge" || r.type === "payment" || r.match === "refund";
    if (!counts) continue;
    const month = r.created.slice(0, 7);
    const b = byMonth.get(month) ?? { netCents: 0, grossCents: 0 };
    b.netCents += r.net;
    b.grossCents += r.amount;
    byMonth.set(month, b);
  }
  return [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([month, v]) => ({ month, ...v }));
}

/**
 * The whole ledger, oldest to newest reversed for display (newest first).
 * `from` and `to` are unix seconds; omit both for everything.
 */
export async function fetchLedger(
  opts: { from?: number; to?: number; orderByIntent: ReadonlyMap<string, string> },
): Promise<Ledger> {
  const key = process.env.STRIPE_SECRET_KEY;
  const fetchedAt = new Date().toISOString();
  if (!key) {
    return { configured: false, error: null, rows: [], summary: emptySummary(), fetchedAt };
  }
  const stripe = new Stripe(key, { timeout: 15_000, maxNetworkRetries: 1 });
  const rows: LedgerRow[] = [];
  try {
    // Invoice -> payment intent, so a subscription charge can be named as
    // one. Paid invoices only; an unpaid invoice has no movement to match.
    const invoiceByIntent = new Map<string, string>();
    let invoicePages = 0;
    for await (const inv of stripe.invoices.list({ limit: 100, status: "paid" })) {
      const pi = (inv as unknown as { payment_intent?: string | { id: string } | null }).payment_intent;
      const piId = idOf(pi ?? null);
      if (piId) invoiceByIntent.set(piId, inv.id);
      if (invoiceByIntent.size % 100 === 0 && ++invoicePages >= 20) break;
    }

    const created: Stripe.RangeQueryParam = {};
    if (opts.from) created.gte = opts.from;
    if (opts.to) created.lte = opts.to;
    const params: Stripe.BalanceTransactionListParams = {
      limit: 100,
      expand: ["data.source"],
      ...(opts.from || opts.to ? { created } : {}),
    };
    // Auto-pagination walks has_more for us. Capped so a runaway account
    // cannot hold the route open: 50 pages is 5,000 movements, well past
    // anything this business has done.
    let pages = 0;
    for await (const t of stripe.balanceTransactions.list(params)) {
      rows.push(toRow(t, opts.orderByIntent, invoiceByIntent));
      if (rows.length % 100 === 0 && ++pages >= 50) break;
    }
  } catch (err) {
    return {
      configured: true,
      error: err instanceof Error ? err.message : String(err),
      rows: [],
      summary: emptySummary(),
      fetchedAt,
    };
  }
  return { configured: true, error: null, rows, summary: summarise(rows), fetchedAt };
}

/**
 * The ledger, cached a minute per range in module memory.
 *
 * Both the ledger route and the revenue route read it, on the same 60s
 * cadence the tab polls at; re-walking every balance transaction on each
 * poll would spend Stripe's rate limit on identical bytes. A failed read is
 * not cached, so the next poll tries again. The order map is only needed
 * for matching; a caller that wants totals alone passes an empty map, and
 * the cache key carries whether matching was asked for so the two never
 * serve each other a half-matched ledger.
 */
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; body: Ledger }>();

export async function cachedLedger(
  range: string,
  orderByIntent: ReadonlyMap<string, string>,
): Promise<Ledger> {
  const key = `${range}:${orderByIntent.size > 0 ? "matched" : "bare"}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.body;
  const body = await fetchLedger({ from: rangeFrom(range), orderByIntent });
  if (!body.error) cache.set(key, { at: Date.now(), body });
  return body;
}

/** The tab's range vocabulary to a unix `from`. `all` and unknown mean none. */
export function rangeFrom(range: string, now: Date = new Date()): number | undefined {
  const day = 86_400;
  const t = Math.floor(now.getTime() / 1000);
  switch (range) {
    case "7d": return t - 7 * day;
    case "30d": return t - 30 * day;
    case "90d": return t - 90 * day;
    case "ytd": return Math.floor(Date.UTC(now.getUTCFullYear(), 0, 1) / 1000);
    default: return undefined;
  }
}
