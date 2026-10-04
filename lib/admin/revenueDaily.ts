/**
 * Shop revenue folded into UTC days, by the day the money landed.
 *
 * WHICH DAY AN ORDER BELONGS TO. The day of shop_orders.paid_at, Stripe's time
 * for the payment, which the settlement writes (lib/shop/webhookSettlement.ts,
 * audit F-33). It used to be the day of created_at, which is when the buyer
 * OPENED checkout, so an order begun at 23:50 UTC on the 17th and paid on the
 * 18th was counted on the 17th.
 *
 * THE FALLBACK, AND IT IS DISCLOSED. A paid or refunded order with no paid_at
 * still happened. The four orders that settled before the settlement wrote the
 * column are that until they are filled in by hand, and so is any order whose
 * settlement could get no time out of Stripe. Leaving them out would paint a
 * day that took money as a day with no sales, the defect the daily route
 * exists to end. So such an order sits on the day its checkout started, and
 * every day says how many of its orders are placed that way (byCheckoutStart),
 * for the day view to print. The column's own comment asks for exactly this:
 * never coalesce to created_at without disclosing that you did.
 *
 * Pure: the rows and the days are inputs. The reads are in
 * app/api/admin/revenue/daily/route.ts.
 */

/** Paid counts; refunded is kept so the order is visible and contributes zero. */
export const REVENUE_STATUSES = ["paid", "refunded"] as const;

export type RevenueOrder = {
  total_cents: number;
  payment_status: string;
  created_at: string;
  paid_at: string | null;
};

export type RevenueDay = {
  date: string;
  netCents: number;
  orderCount: number;
  /** Of orderCount, the orders with no recorded payment time, placed by the day checkout started. */
  byCheckoutStart: number;
};

const isRevenue = (status: string) => (REVENUE_STATUSES as readonly string[]).includes(status);
const netOf = (o: RevenueOrder) => (o.payment_status === "refunded" ? 0 : o.total_cents);

/**
 * The UTC calendar day of a timestamp, whatever offset it was written with.
 * Parsed rather than sliced: the first ten characters are the UTC day only
 * while the database answers in UTC, and a day is too easy to get wrong
 * silently to rest on that.
 */
export function utcDayOf(iso: string): string | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

/**
 * What the day view prints under a day of shop orders: which day an order is
 * counted on, and how many of this day's orders are not there by a measured
 * time. `byCheckoutStart` is null for a series that is not shop orders, and
 * such a series gets no note.
 *
 * Here rather than in the component so the three sentences and their plural
 * are tested: this is the disclosure the fallback above depends on.
 */
export function dayBasisNote(money: boolean, byCheckoutStart: number | null): string | null {
  if (byCheckoutStart === null) return null;
  const parts: string[] = [];
  if (money) {
    parts.push(
      "Shop orders only. Donations are stored monthly and subscription revenue has no date, so neither can be placed on a day.",
    );
  }
  parts.push("An order is counted on the day its payment landed, in UTC, not the day checkout started.");
  if (byCheckoutStart === 1) {
    parts.push("1 order here has no recorded payment time, so it sits on the day its checkout started.");
  } else if (byCheckoutStart > 1) {
    parts.push(
      `${byCheckoutStart} orders here have no recorded payment time, so they sit on the day their checkout started.`,
    );
  }
  return parts.join(" ");
}

/**
 * One row per day in `dayKeys`, in that order, including the days with nothing
 * on them. An order whose day is not among them is not counted.
 */
export function foldDailyRevenue(
  orders: readonly RevenueOrder[],
  dayKeys: readonly string[],
): RevenueDay[] {
  const buckets = new Map<string, RevenueDay>(
    dayKeys.map((date) => [date, { date, netCents: 0, orderCount: 0, byCheckoutStart: 0 }]),
  );
  for (const o of orders) {
    if (!isRevenue(o.payment_status)) continue;
    const day = utcDayOf(o.paid_at ?? o.created_at);
    const bucket = day ? buckets.get(day) : undefined;
    if (!bucket) continue;
    bucket.netCents += netOf(o);
    bucket.orderCount += 1;
    if (!o.paid_at) bucket.byCheckoutStart += 1;
  }
  return [...buckets.values()];
}
