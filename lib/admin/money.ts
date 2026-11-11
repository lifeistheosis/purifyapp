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
 * WHERE PLUS COMES FROM (2026-11-09). When RevenueCat answers, Plus is what
 * its customers actually paid in the period (its revenue for those days,
 * after refunds), less the stores' cut for the part bought through a store:
 * real money, with only the cut estimated. When it does not, Plus is the
 * estimate above, and "This month" counts only the part of the month gone so
 * far (it used to count the whole month on its first day, beside a shop that
 * counted only the days so far). A partial refund is taken off its order
 * (lib/shop/partialRefunds.ts); it used to be counted as kept.
 *
 * Pure: the rows and the clock come in. The reads are in
 * app/api/admin/money/route.ts.
 */

import { keptCents, partlyRefundedCents, type RefundsByOrder } from "@/lib/shop/partialRefunds";

/** "all": All time, from the month of the first paid order (the owner, 2026-11-11). */
export type MoneyPeriod = "month" | "30d" | "90d" | "12m" | "all";

export const MONEY_PERIODS: readonly (readonly [MoneyPeriod, string])[] = [
  ["month", "This month"],
  ["30d", "30 days"],
  ["90d", "90 days"],
  ["12m", "12 months"],
  ["all", "All time"],
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

/** All time holds at most this many months, as daysSince holds at most two years (lib/admin/dayWindow.ts). */
export const ALL_TIME_MONTHS = 24;

/**
 * `earliest`, for All time only: when the first paid order's checkout began. All
 * time runs by month from that month to now, at most ALL_TIME_MONTHS, and has no
 * period before it to compare with (`beforeSince` is `since`, `beforeLabel` empty).
 */
export function moneyWindow(period: MoneyPeriod, now: Date, earliest?: string | null): MoneyWindow {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (period === "all") {
    const t = earliest ? Date.parse(earliest) : NaN;
    const first = Number.isFinite(t) && t <= now.getTime() ? new Date(t) : now;
    const span = (y - first.getUTCFullYear()) * 12 + (m - first.getUTCMonth()) + 1;
    const months = Math.min(ALL_TIME_MONTHS, Math.max(1, span));
    const since = new Date(Date.UTC(y, m - (months - 1), 1)).toISOString();
    return { period, since, beforeSince: since, label: "all time", beforeLabel: "", months, buckets: "month" };
  }
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
  /** Read so a partial refund can be matched to its order. */
  id?: string | null;
  total_cents: number;
  payment_status: string;
  created_at: string;
  paid_at: string | null;
  items?: { product_id: string | null; quantity: number }[] | null;
};

/** When an order's money landed: its payment time, or its checkout's start when none was recorded. */
export const landedAt = (o: MoneyOrder) => o.paid_at ?? o.created_at;

/**
 * The shop in a window: a paid order counts its total less any partial refund
 * (`refunds`, lib/shop/partialRefunds.ts), a refunded one nothing.
 * `partlyRefunded` counts the paid orders that gave some of it back.
 */
export function shopNet(
  orders: readonly MoneyOrder[],
  refunds?: RefundsByOrder | null,
): { netCents: number; paid: number; refunded: number; partlyRefunded: number; partlyRefundedCents: number } {
  let netCents = 0;
  let paid = 0;
  let refunded = 0;
  let partlyRefunded = 0;
  let partCents = 0;
  for (const o of orders) {
    if (o.payment_status === "paid") {
      netCents += keptCents(o, refunds);
      paid += 1;
      const back = partlyRefundedCents(o, refunds);
      if (back > 0) {
        partlyRefunded += 1;
        partCents += back;
      }
    } else if (o.payment_status === "refunded") refunded += 1;
  }
  return { netCents, paid, refunded, partlyRefunded, partlyRefundedCents: partCents };
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
  return afterStoreCut(mrrCents * months, storeShare);
}

/**
 * What is left of Plus revenue after the stores' cut, when `storeShare` of it
 * was bought through a store. RevenueCat's revenue still holds the cut (and
 * any tax the store collected), so this is how a real figure from it becomes
 * what Purify keeps; the cut itself is the part that is estimated.
 */
export function afterStoreCut(grossCents: number, storeShare: number): number {
  const share = Math.min(1, Math.max(0, Number.isFinite(storeShare) ? storeShare : 1));
  return Math.round(grossCents * (1 - STORE_CUT * share));
}

/**
 * The part of the paying members who pay through a store, from the active
 * members by source (lib/entitlements/adminStats.ts bySource): Google Play
 * and the App Store against web billing. All of them when none can be told
 * apart, the larger cut, so an unknown mix never flatters the figure.
 */
export function storeShareOf(bySource: Readonly<Record<string, number>>): number {
  const store = (bySource.apple ?? 0) + (bySource.google ?? 0);
  const web = bySource.stripe ?? 0;
  return store + web > 0 ? store / (store + web) : 1;
}

/**
 * How many months of the Plus ESTIMATE a period carries. The estimate is a
 * monthly rate, so a period is the months it spans, with two corrections the
 * costs do not need: "This month" counts only the part of the month gone so
 * far, as the shop beside it does, and no period reaches back before
 * `launch`, when nobody could pay for Plus at all.
 */
export function plusMonths(period: MoneyPeriod, now: Date, launch: string | null = null): number {
  const t = now.getTime();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const launched = launch ? Date.parse(`${launch}T00:00:00Z`) : Number.NaN;
  const sinceLaunch = Number.isFinite(launched) ? Math.max(0, (t - launched) / (30.4375 * DAY_MS)) : Infinity;
  if (period === "month") {
    const start = Date.UTC(y, m, 1);
    const end = Date.UTC(y, m + 1, 1);
    const from = Number.isFinite(launched) ? Math.max(start, launched) : start;
    return Math.max(0, Math.min(1, (t - from) / (end - start)));
  }
  const span = period === "30d" ? 1 : period === "90d" ? 3 : 12;
  return Math.min(span, sinceLaunch);
}

export type MoneyParts = {
  shopCents: number | null;
  plusCents: number | null;
  /**
   * False when Plus is RevenueCat's real revenue (only the stores' cut on it
   * estimated); true, the default, when it is the list-price estimate.
   */
  plusEstimated?: boolean;
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

  const estimated = ((p.plusCents ?? 0) > 0 && p.plusEstimated !== false) || inMissing.length > 0;
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
export function shopBuckets(
  orders: readonly MoneyOrder[],
  w: MoneyWindow,
  now: Date,
  refunds?: RefundsByOrder | null,
): { current: number[]; before: number[] } {
  const since = Date.parse(w.since);
  const beforeSince = Date.parse(w.beforeSince);
  const net = (o: MoneyOrder) => keptCents(o, refunds);
  if (w.buckets === "month") {
    const key = (t: number) => {
      const d = new Date(t);
      return d.getUTCFullYear() * 12 + d.getUTCMonth();
    };
    // A bucket a month: twelve for 12 months, as many as All time holds, and no
    // months before when there is no period before (All time).
    const first = key(since);
    const firstBefore = key(beforeSince);
    const current = new Array<number>(w.months).fill(0);
    const before = new Array<number>(beforeSince < since ? w.months : 0).fill(0);
    for (const o of orders) {
      const t = Date.parse(landedAt(o));
      if (!Number.isFinite(t)) continue;
      const k = key(t);
      if (t >= since && k - first < current.length) current[k - first] += net(o);
      else if (t >= beforeSince && t < since && k - firstBefore < before.length) before[k - firstBefore] += net(o);
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
