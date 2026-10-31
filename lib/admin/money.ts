/**
 * Came in, went out, kept: Money's three figures.
 *
 * The owner's pick for Money on sheet r3-15 (2026-10-30, "Do A for money?"):
 * three figures for the period. What came in is the shop, paid less refunds,
 * and Plus after the stores' cut; what went out is the cost lines, the goods
 * sold at their cost, and Stripe's fees; what was kept is the one less the
 * other. An estimate wears a dashed line and the word est. Donations, typed
 * in by hand, are shown apart and kept out of every total, as
 * lib/admin/profit.ts already rules: a recalled number must not move a
 * profit line. Then the shop's days against the period before, and each view
 * as one line with its headline.
 *
 * WHAT IS MEASURED AND WHAT IS NOT. The shop is realized (paid orders). Plus
 * is ESTIMATED: entitlements keep who has Plus, not what they were billed, so
 * it is today's paying members at list price, less the stores' 15% for the
 * members who pay through a store (lib/premium/boxBudget.ts STORE_FEE_PCT).
 * The goods are each item sold times its cost in Catalogue, and an item with
 * no cost there is counted, named and left out of the sum, never priced at
 * zero. A figure that could not be read is null and the page says so; a total
 * missing one of its parts says which.
 *
 * Pure: the rows and the clock come in. The reads are in
 * app/api/admin/money/route.ts.
 */

export type MoneyPeriod = "month" | "30d" | "90d" | "12m";

export const MONEY_PERIODS: readonly (readonly [MoneyPeriod, string])[] = [
  ["month", "This month"],
  ["30d", "30 days"],
  ["90d", "90 days"],
  ["12m", "12 months"],
];

const DAY_MS = 86_400_000;

export type MoneyWindow = {
  period: MoneyPeriod;
  /** ISO: the period's first moment (UTC). */
  since: string;
  /** ISO: the period before it starts here, and ends at `since`. */
  beforeSince: string;
  /** "October", "30 days". */
  label: string;
  /** What the period before is called: "September", "the 30 days before". */
  beforeLabel: string;
  /** How many months of the monthly costs and of Plus the period carries. */
  months: number;
  /** The chart's buckets. */
  buckets: "day" | "month";
};

function utcMidnight(t: number): number {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

const monthName = (y: number, m: number) =>
  new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });

export function moneyWindow(period: MoneyPeriod, now: Date): MoneyWindow {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (period === "month") {
    return {
      period,
      since: new Date(Date.UTC(y, m, 1)).toISOString(),
      beforeSince: new Date(Date.UTC(y, m - 1, 1)).toISOString(),
      label: monthName(y, m),
      beforeLabel: monthName(y, m - 1),
      months: 1,
      buckets: "day",
    };
  }
  if (period === "12m") {
    return {
      period,
      since: new Date(Date.UTC(y, m - 11, 1)).toISOString(),
      beforeSince: new Date(Date.UTC(y, m - 23, 1)).toISOString(),
      label: "12 months",
      beforeLabel: "the 12 months before",
      months: 12,
      buckets: "month",
    };
  }
  const days = period === "30d" ? 30 : 90;
  const start = utcMidnight(now.getTime()) - (days - 1) * DAY_MS;
  return {
    period,
    since: new Date(start).toISOString(),
    beforeSince: new Date(start - days * DAY_MS).toISOString(),
    label: `${days} days`,
    beforeLabel: `the ${days} days before`,
    months: days === 30 ? 1 : 3,
    buckets: "day",
  };
}

export type MoneyOrder = {
  total_cents: number;
  payment_status: string;
  created_at: string;
  paid_at: string | null;
  items?: { product_id: string | null; quantity: number }[] | null;
};

/** When an order's money landed: its payment time, or its checkout's start when none was recorded. */
export const landedAt = (o: MoneyOrder) => o.paid_at ?? o.created_at;

/** The shop in a window: paid orders count their total, refunded ones nothing. */
export function shopNet(orders: readonly MoneyOrder[]): { netCents: number; paid: number; refunded: number } {
  let netCents = 0;
  let paid = 0;
  let refunded = 0;
  for (const o of orders) {
    if (o.payment_status === "paid") {
      netCents += o.total_cents;
      paid += 1;
    } else if (o.payment_status === "refunded") refunded += 1;
  }
  return { netCents, paid, refunded };
}

/**
 * The goods sold, at their cost in Catalogue. An item whose product has no
 * cost there (or no product any more) is counted in `unknownUnits` and left
 * out of the sum.
 */
export function goodsAtCost(
  orders: readonly MoneyOrder[],
  costByProduct: ReadonlyMap<string, number | null>,
): { cents: number; units: number; unknownUnits: number } {
  let cents = 0;
  let units = 0;
  let unknownUnits = 0;
  for (const o of orders) {
    if (o.payment_status !== "paid") continue;
    for (const it of o.items ?? []) {
      const q = Math.max(0, it.quantity ?? 0);
      units += q;
      const c = it.product_id ? costByProduct.get(it.product_id) : undefined;
      if (typeof c === "number" && Number.isFinite(c)) cents += c * q;
      else unknownUnits += q;
    }
  }
  return { cents, units, unknownUnits };
}

/** The stores' cut, the small business rate both stores charge (lib/premium/boxBudget.ts). */
export const STORE_CUT = 0.15;

/**
 * Plus after the stores' cut over `months`, from today's paying members at
 * list price. `storeShare` is the part of them that pays through a store; the
 * rest pay on the website, whose fees are Stripe's and counted there.
 */
export function plusAfterCut(mrrCents: number, months: number, storeShare: number): number {
  const share = Math.min(1, Math.max(0, Number.isFinite(storeShare) ? storeShare : 1));
  return Math.round(mrrCents * months * (1 - STORE_CUT * share));
}

export type MoneyParts = {
  shopCents: number | null;
  plusCents: number | null;
  costLinesCents: number | null;
  goodsCents: number | null;
  /** Units sold whose cost is not in Catalogue. */
  goodsUnknownUnits: number;
  feesCents: number | null;
};

export type MoneyFigures = {
  cameIn: { cents: number | null; estimated: boolean; missing: string[] };
  wentOut: { cents: number | null; missing: string[] };
  kept: { cents: number | null; estimated: boolean; pctOfCameIn: number | null };
};

/**
 * The three figures from their parts. A total is null only when its first
 * part (the shop for what came in) could not be read; a later part that
 * could not be read is left out and named in `missing`, and the kept figure
 * becomes an estimate, because it is no longer the whole.
 */
export function moneyFigures(p: MoneyParts): MoneyFigures {
  const inMissing: string[] = [];
  if (p.plusCents === null) inMissing.push("Plus");
  const cameIn = p.shopCents === null ? null : p.shopCents + (p.plusCents ?? 0);

  const outMissing: string[] = [];
  if (p.costLinesCents === null) outMissing.push("the cost lines");
  if (p.goodsCents === null) outMissing.push("the goods");
  if (p.feesCents === null) outMissing.push("Stripe's fees");
  if (p.goodsUnknownUnits > 0) outMissing.push(p.goodsUnknownUnits === 1 ? "1 item with no cost in Catalogue" : `${p.goodsUnknownUnits} items with no cost in Catalogue`);
  const parts = [p.costLinesCents, p.goodsCents, p.feesCents].filter((v): v is number => v !== null);
  const wentOut = parts.length === 0 ? null : parts.reduce((a, b) => a + b, 0);

  const estimated = (p.plusCents ?? 0) > 0 || inMissing.length > 0;
  const kept = cameIn === null || wentOut === null ? null : cameIn - wentOut;
  return {
    cameIn: { cents: cameIn, estimated, missing: inMissing },
    wentOut: { cents: wentOut, missing: outMissing },
    kept: {
      cents: kept,
      estimated: estimated || outMissing.length > 0,
      pctOfCameIn: kept !== null && cameIn !== null && cameIn > 0 ? Math.round((kept / cameIn) * 100) : null,
    },
  };
}

/**
 * The shop's net in buckets for the chart: the period's days (or months),
 * and the period before's, oldest first. A bucket with nothing in it is a
 * real zero: the orders were read.
 */
export function shopBuckets(orders: readonly MoneyOrder[], w: MoneyWindow, now: Date): { current: number[]; before: number[] } {
  const since = Date.parse(w.since);
  const beforeSince = Date.parse(w.beforeSince);
  const net = (o: MoneyOrder) => (o.payment_status === "paid" ? o.total_cents : 0);
  if (w.buckets === "month") {
    const key = (t: number) => {
      const d = new Date(t);
      return d.getUTCFullYear() * 12 + d.getUTCMonth();
    };
    const first = key(since);
    const firstBefore = key(beforeSince);
    const current = new Array<number>(12).fill(0);
    const before = new Array<number>(12).fill(0);
    for (const o of orders) {
      const t = Date.parse(landedAt(o));
      if (!Number.isFinite(t)) continue;
      const k = key(t);
      if (t >= since && k - first < 12) current[k - first] += net(o);
      else if (t >= beforeSince && t < since && k - firstBefore < 12) before[k - firstBefore] += net(o);
    }
    return { current, before };
  }
  const today = utcMidnight(now.getTime());
  const days = Math.round((today - since) / DAY_MS) + 1;
  const beforeDays = Math.round((since - beforeSince) / DAY_MS);
  const current = new Array<number>(Math.max(1, days)).fill(0);
  const before = new Array<number>(Math.max(1, beforeDays)).fill(0);
  for (const o of orders) {
    const t = Date.parse(landedAt(o));
    if (!Number.isFinite(t)) continue;
    const day = utcMidnight(t);
    if (t >= since) {
      const i = Math.round((day - since) / DAY_MS);
      if (i >= 0 && i < current.length) current[i] += net(o);
    } else if (t >= beforeSince) {
      const i = Math.round((day - beforeSince) / DAY_MS);
      if (i >= 0 && i < before.length) before[i] += net(o);
    }
  }
  return { current, before };
}
