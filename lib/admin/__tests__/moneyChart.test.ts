// All the money on Money's chart (his word, 2026-11-12 about 21:42 UTC: "I
// don't want you to just do, like to just show the shop data on the chart. I
// want you to show everything related to money on the timeline"). Until then
// the chart drew the shop's orders and nothing else, so Plus and the EIKON Box
// membership, which come through RevenueCat, were on no chart at all.
//
// What these hold: every recorded source lands in its own series on the day
// (or month) its money moved; refunds are their own series, below the line;
// test money and grants never count; a subscription whose product names no
// plan is kept apart rather than guessed; a day before the first kept record
// is said to be unknown, never drawn as no money; and the chart's total for the
// period is exactly what Came in counts when both read the same records.

import { describe, expect, it } from "vitest";

import { moneyWindow, shopNet, type MoneyOrder } from "../money";
import { columnNet, moneyChart, type MoneyColumn } from "../moneyChart";
import { planOf, tally, type PlusFact } from "../plusHistory";

const NOW = new Date("2026-11-12T15:00:00Z");

const order = (id: string, cents: number, status: string, paid: string): MoneyOrder => ({
  id,
  total_cents: cents,
  payment_status: status,
  created_at: paid,
  paid_at: paid,
});

const fact = (over: Partial<PlusFact>): PlusFact => ({
  type: "RENEWAL",
  user_id: "u1",
  store: "PLAY_STORE",
  product_id: "purify_plus:monthly",
  environment: "PRODUCTION",
  period_type: "NORMAL",
  price_usd: 9.99,
  takehome: 0.85,
  trial_conversion: null,
  reason: null,
  event_at: "2026-11-03T10:00:00+00:00",
  expires_at: null,
  ...over,
});

const ORDERS: MoneyOrder[] = [
  order("o1", 4000, "paid", "2026-11-03T09:00:00Z"),
  order("o2", 1500, "refunded", "2026-11-05T12:00:00Z"),
  order("o3", 2000, "paid", "2026-11-12T08:00:00Z"),
  order("o4", 900, "paid", "2026-10-20T08:00:00Z"),
];
// o3 gave $5 of its $20 back; it stays paid (lib/shop/partialRefunds.ts).
const REFUNDS = new Map([["o3", 500]]);

const FACTS: PlusFact[] = [
  // Plus on Google Play, after its take-home share.
  fact({}),
  // The EIKON Box membership (Pro) on the App Store, with no share sent: 85%.
  fact({ type: "INITIAL_PURCHASE", store: "APP_STORE", product_id: "net.purifyapp.purify.pro.monthly", price_usd: 19.99, takehome: null, event_at: "2026-11-07T10:00:00+00:00" }),
  // Plus on the website keeps its whole price: Stripe's fees are under Went out.
  fact({ store: "RC_BILLING", product_id: "Plus Annual", price_usd: 71.99, takehome: 0.95, event_at: "2026-11-10T10:00:00+00:00" }),
  // A product that names no plan: kept apart, never guessed into one.
  fact({ product_id: "premium_monthly", price_usd: 4.99, takehome: 0.7, event_at: "2026-11-11T10:00:00+00:00" }),
  // A refund of a Plus month, after the store's share.
  fact({ type: "CANCELLATION", reason: "CUSTOMER_SUPPORT", price_usd: -9.99, event_at: "2026-11-12T10:00:00+00:00" }),
  // Never money: test money and a grant.
  fact({ environment: "SANDBOX", price_usd: 99, event_at: "2026-11-04T10:00:00+00:00" }),
  fact({ store: "PROMOTIONAL", period_type: "PROMOTIONAL", price_usd: 0, event_at: "2026-11-04T11:00:00+00:00" }),
  // Moves no money.
  fact({ type: "CANCELLATION", reason: "UNSUBSCRIBE", price_usd: null, event_at: "2026-11-06T10:00:00+00:00" }),
  // The month before.
  fact({ event_at: "2026-10-20T10:00:00+00:00" }),
];

const zero: MoneyColumn = { shop: 0, plus: 0, box: 0, unnamed: 0, refunds: 0 };

describe("the chart of all the money", () => {
  const w = moneyWindow("month", NOW);
  const chart = moneyChart({ orders: ORDERS, refunds: REFUNDS, plus: { state: "ok", facts: FACTS, since: "2026-10-15T08:00:00+00:00" }, w, now: NOW });

  it("puts each source on the day its money moved, refunds apart", () => {
    expect(chart.current).toHaveLength(12);
    expect(chart.current[2]).toEqual({ ...zero, shop: 4000, plus: 849 });
    // A refunded order: what was paid, and all of it back.
    expect(chart.current[4]).toEqual({ ...zero, shop: 1500, refunds: 1500 });
    expect(chart.current[6]).toEqual({ ...zero, box: 1699 });
    expect(chart.current[9]).toEqual({ ...zero, plus: 7199 });
    expect(chart.current[10]).toEqual({ ...zero, unnamed: 349 });
    // The partial refund and the Plus refund, both on the 12th.
    expect(chart.current[11]).toEqual({ ...zero, shop: 2000, refunds: 500 + 849 });
    // Test money, a grant and a turned-off renewal are on no day.
    expect(chart.current[3]).toEqual(zero);
    expect(chart.current[5]).toEqual(zero);
  });

  it("lays the month before beside it as one total a day", () => {
    expect(chart.before).toHaveLength(31);
    expect(chart.before[19]).toBe(900 + 849);
  });

  it("totals the period, and its net is exactly what Came in counts from the same records", () => {
    expect(chart.totals).toEqual({ shop: 7500, plus: 849 + 7199, box: 1699, unnamed: 349, refunds: 500 + 1500 + 849, net: 14_747 });
    const since = Date.parse(w.since);
    const shop = shopNet(ORDERS.filter((o) => Date.parse(o.paid_at as string) >= since), REFUNDS).netCents;
    const plus = tally(FACTS.filter((f) => Date.parse(f.event_at) >= since)).afterStoreCents;
    expect(chart.totals.net).toBe(shop + plus);
    expect(chart.current.reduce((a, c) => a + columnNet(c), 0)).toBe(chart.totals.net);
  });

  it("says subscriptions were kept for the whole period", () => {
    expect(chart).toMatchObject({ subs: "kept", subsFrom: "2026-10-15", subsFromIndex: 0 });
  });
});

describe("what the chart cannot know", () => {
  it("marks the first day subscriptions were kept, inside the period", () => {
    const w = moneyWindow("30d", NOW);
    const chart = moneyChart({ orders: [], refunds: null, plus: { state: "ok", facts: [fact({ event_at: "2026-11-09T10:00:00Z" })], since: "2026-11-09T10:00:00Z" }, w, now: NOW });
    // The 30 days run from 2026-10-14, so the 9th of November is the 26th day.
    expect(chart.subsFrom).toBe("2026-11-09");
    expect(chart.subsFromIndex).toBe(26);
    expect(chart.current[26].plus).toBe(849);
  });

  it("finds the month subscriptions began in, by month", () => {
    const w = moneyWindow("12m", NOW);
    const chart = moneyChart({ orders: ORDERS, refunds: REFUNDS, plus: { state: "ok", facts: FACTS, since: "2026-10-15T08:00:00Z" }, w, now: NOW });
    // December 2025 to November 2026: October is the eleventh bucket.
    expect(chart.current).toHaveLength(12);
    expect(chart.subsFromIndex).toBe(10);
    expect(chart.current[10]).toEqual({ ...zero, shop: 900, plus: 849 });
    expect(chart.current[11]).toEqual({ shop: 7500, plus: 849 + 7199, box: 1699, unnamed: 349, refunds: 2849 });
    expect(chart.before).toHaveLength(12);
  });

  it("draws the shop alone, and says so, while subscriptions are not kept on this server", () => {
    const w = moneyWindow("month", NOW);
    for (const state of ["absent", "unavailable"] as const) {
      const chart = moneyChart({ orders: ORDERS, refunds: REFUNDS, plus: { state }, w, now: NOW });
      expect(chart).toMatchObject({ subs: state, subsFrom: null, subsFromIndex: null });
      expect(chart.totals).toEqual({ shop: 7500, plus: 0, box: 0, unnamed: 0, refunds: 2000, net: 5500 });
    }
  });

  it("knows no subscriptions at all while nothing has been kept yet", () => {
    const chart = moneyChart({ orders: [], refunds: null, plus: { state: "ok", facts: [], since: null }, w: moneyWindow("month", NOW), now: NOW });
    expect(chart).toMatchObject({ subs: "kept", subsFrom: null, subsFromIndex: null });
  });

  it("has no period before for All time", () => {
    const w = moneyWindow("all", NOW, "2026-06-20T09:00:00Z");
    const chart = moneyChart({ orders: ORDERS, refunds: REFUNDS, plus: { state: "ok", facts: FACTS, since: "2026-10-15T08:00:00Z" }, w, now: NOW });
    expect(chart.current).toHaveLength(6);
    expect(chart.before).toEqual([]);
    expect(chart.subsFromIndex).toBe(4);
  });

  it("puts a refund given back to its plan again", () => {
    const w = moneyWindow("month", NOW);
    const chart = moneyChart({ orders: [], refunds: null, plus: { state: "ok", facts: [fact({ type: "REFUND_REVERSED", price_usd: 9.99 })], since: "2026-10-01T00:00:00Z" }, w, now: NOW });
    expect(chart.current[2]).toEqual({ ...zero, plus: 849 });
  });
});

describe("which plan a subscription paid for", () => {
  it("reads the plan from the product's own name", () => {
    expect(planOf("purify_pro:monthly")).toBe("box");
    expect(planOf("net.purifyapp.purify.pro.monthly")).toBe("box");
    expect(planOf("pro_monthly")).toBe("box");
    expect(planOf("Pro")).toBe("box");
    expect(planOf("purify_plus:yearly")).toBe("plus");
    expect(planOf("Plus Annual")).toBe("plus");
    expect(planOf("PLUS")).toBe("plus");
  });

  it("never guesses: a word that only contains one, both, or none is no plan", () => {
    expect(planOf("product_monthly")).toBeNull();
    expect(planOf("promo")).toBeNull();
    expect(planOf("premium")).toBeNull();
    expect(planOf("plus_to_pro")).toBeNull();
    expect(planOf("")).toBeNull();
    expect(planOf(null)).toBeNull();
    expect(planOf(undefined)).toBeNull();
  });
});
