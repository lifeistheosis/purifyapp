/**
 * All the money on Money's chart, by where it came from.
 *
 * His word, 2026-11-12 about 21:42 UTC: "Also on the admin panel, I don't
 * want you to just do, like to just show the shop data on the chart. I want
 * you to show everything related to money on the timeline, because yeah, I
 * just don't see that. It only shows up everything that goes through the
 * shop, but I want the subscriptions also on the shop. And if you can make it
 * a different color, right, if that helps. But like, if you apply a
 * distinction, of course. If there's no distinction, then it just shows up all
 * white. all together on the chart."
 *
 * So each bucket (a day, or a month for 12 months and All time) holds every
 * source that is recorded one payment at a time, each in its own series:
 *
 *   shop      the EIKON shop's orders, through Stripe, as paid, on the day
 *             the payment landed (lib/admin/money.ts landedAt)
 *   plus      Purify Plus, from the RevenueCat events the webhook keeps
 *             (public.plus_events, lib/admin/plusHistory.ts)
 *   box       the EIKON Box membership, which is Purify Pro, from the same
 *             events, told apart by the product's name (planOf)
 *   unnamed   a subscription whose product names neither plan: kept apart and
 *             drawn in the chart's own ink, his "all white", never guessed
 *   refunds   what went back, drawn below the line: a whole or partial shop
 *             refund on its order's own day, as every figure in the panel
 *             takes it (lib/shop/partialRefunds.ts), and a subscription
 *             refund on the day RevenueCat sent it
 *
 * ONE AMOUNT, NEVER TWO. Every figure here is what reached Purify after the
 * stores' cut and before Stripe's fees: the shop as paid (there is no store
 * in it), a Google Play or App Store payment after that store's share
 * (RevenueCat's take-home share for it, or the stores' usual 15% where it sent
 * none), and website Plus whole, because its fees, like the shop's, are in
 * Stripe's ledger under Went out. That is the amount Came in counts, so a
 * bucket's net (its series less its refunds) adds up to Came in over the
 * period whenever Came in takes Plus from the same kept events. Plus as the
 * reader paid it, before the cut, is not drawn anywhere on this chart.
 *
 * WHAT IS NOT DRAWN, AND IS SAID. Subscription money exists here only from
 * the first kept event on: plus_events arrives with 1.9, and before its first
 * row no record of a subscription payment exists anywhere the panel can read
 * by day: the RevenueCat calls the panel makes answer a total for a span
 * (lib/billing/revenuecatMetrics.ts), and RevenueCat's by-day chart asks a
 * further permission of the key, charts_metrics:charts:read (its API docs,
 * read 2026-11-12). So `subsFrom` and `subsFromIndex` mark where they begin,
 * and a day before it is shown as not kept, never as a day with no Plus. Donations, typed in by hand by the month,
 * stay off the chart as they stay out of every total (lib/admin/profit.ts).
 *
 * Pure: the rows, the window and the clock come in. The reads are in
 * app/api/admin/money/route.ts.
 */

import { keptCents, type RefundsByOrder } from "@/lib/shop/partialRefunds";

import { bucketCounts, bucketOf, landedAt, type MoneyOrder, type MoneyWindow } from "./money";
import { afterStoreCents, counts, planOf, utcDay, type PlusFact } from "./plusHistory";

/** One bucket of the chart, in cents. `refunds` is what went back, as a positive amount drawn below the line. */
export type MoneyColumn = { shop: number; plus: number; box: number; unnamed: number; refunds: number };

/** The series drawn above the line, from the line up. */
export const MONEY_STACK = ["shop", "plus", "box", "unnamed"] as const;
export type MoneyStackKey = (typeof MONEY_STACK)[number];

/**
 * What the kept subscription events could say: read (with when the first was
 * kept, null while none has been), not kept on this server (no table yet), or
 * not readable just now. The same three answers as lib/admin/plusEvents.server.ts.
 */
export type MoneyPlusRead =
  | { state: "ok"; facts: readonly PlusFact[]; since: string | null }
  | { state: "absent" }
  | { state: "unavailable" };

export type MoneyChart = {
  /** The period's buckets, oldest first. */
  current: MoneyColumn[];
  /** The period before, one net total a bucket (all sources together), oldest first; empty for All time. */
  before: number[];
  /** The period's sums, and its net: what came in less what went back. */
  totals: MoneyColumn & { net: number };
  /** "kept": subscriptions are drawn from `subsFrom` on; "absent": this server keeps none; "unavailable": not readable just now. */
  subs: "kept" | "absent" | "unavailable";
  /** The UTC day the first subscription event was kept, or null when none has been. */
  subsFrom: string | null;
  /** The first of the period's buckets that holds subscriptions: 0 when all of them do, null when none does. */
  subsFromIndex: number | null;
};

const empty = (): MoneyColumn => ({ shop: 0, plus: 0, box: 0, unnamed: 0, refunds: 0 });

/** What a bucket brought in, less what went back. */
export const columnNet = (c: MoneyColumn) => c.shop + c.plus + c.box + c.unnamed - c.refunds;

export function moneyChart({
  orders,
  refunds,
  plus,
  w,
  now,
}: {
  /** The shop's paid and refunded orders, his own test orders already taken out. */
  orders: readonly MoneyOrder[];
  /** Partial refunds by order, or null when they could not be read (then none is taken off). */
  refunds?: RefundsByOrder | null;
  plus: MoneyPlusRead;
  w: MoneyWindow;
  now: Date;
}): MoneyChart {
  const n = bucketCounts(w, now);
  const current = Array.from({ length: n.current }, empty);
  const beforeCols = Array.from({ length: n.before }, empty);
  const at = (t: number) => {
    const b = bucketOf(t, w, n);
    return b ? (b.before ? beforeCols : current)[b.i] : null;
  };

  for (const o of orders) {
    if (o.payment_status !== "paid" && o.payment_status !== "refunded") continue;
    const col = at(Date.parse(landedAt(o)));
    if (!col) continue;
    const paid = Math.max(0, o.total_cents ?? 0);
    col.shop += paid;
    col.refunds += paid - keptCents(o, refunds);
  }

  if (plus.state === "ok") {
    for (const f of plus.facts) {
      if (!counts(f)) continue;
      const cents = afterStoreCents(f);
      if (cents === 0) continue;
      const col = at(Date.parse(f.event_at));
      if (!col) continue;
      if (cents < 0) col.refunds += -cents;
      else col[planOf(f.product_id) ?? "unnamed"] += cents;
    }
  }

  const totals = current.reduce(
    (t, c) => ({
      shop: t.shop + c.shop,
      plus: t.plus + c.plus,
      box: t.box + c.box,
      unnamed: t.unnamed + c.unnamed,
      refunds: t.refunds + c.refunds,
    }),
    empty(),
  );

  const subsFrom = plus.state === "ok" && plus.since ? utcDay(plus.since) : null;
  return {
    current,
    before: beforeCols.map(columnNet),
    totals: { ...totals, net: columnNet(totals) },
    subs: plus.state === "ok" ? "kept" : plus.state,
    subsFrom,
    subsFromIndex: subsFrom === null ? null : firstKeptBucket(Date.parse(`${subsFrom}T00:00:00Z`), w, n, now),
  };
}

/**
 * The first of the period's buckets from the day keeping began: 0 when it
 * began before the period, the bucket holding that day when inside it (a
 * month that began part way through counts as kept, its first day marked),
 * and null when it begins after today.
 */
function firstKeptBucket(day: number, w: MoneyWindow, n: { current: number; before: number }, now: Date): number | null {
  if (day <= Date.parse(w.since)) return 0;
  if (day > now.getTime()) return null;
  return bucketOf(day, w, n)?.i ?? null;
}
