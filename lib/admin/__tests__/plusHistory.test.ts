// Plus over time (1.9, admin item A2): what the kept RevenueCat events count.
// The rules that matter most: test money and grants are never income or
// members, a refund comes off once, a trial is not a member who pays, and the
// website's Plus keeps its whole price here because Stripe's ledger holds its
// fees.

import { describe, expect, it } from "vitest";

import {
  afterStoreCents,
  byDay,
  byWeek,
  grossCents,
  inTrialNow,
  isRefund,
  setAside,
  tally,
  weekOf,
  withStorePlus,
  type PlusFact,
} from "../plusHistory";

const NOW = new Date("2026-11-11T15:00:00Z"); // a Wednesday

const fact = (over: Partial<PlusFact>): PlusFact => ({
  type: "INITIAL_PURCHASE",
  user_id: "u1",
  store: "PLAY_STORE",
  environment: "PRODUCTION",
  period_type: "NORMAL",
  price_usd: 4.99,
  takehome: null,
  trial_conversion: null,
  reason: null,
  event_at: "2026-11-10T10:00:00+00:00",
  expires_at: "2026-12-10T10:00:00+00:00",
  ...over,
});

describe("the money one event moved", () => {
  it("a purchase or renewal in, after the store's take-home share, or 85% without one", () => {
    expect(grossCents(fact({}))).toBe(499);
    expect(afterStoreCents(fact({ takehome: 0.7 }))).toBe(349);
    expect(afterStoreCents(fact({}))).toBe(424);
    expect(grossCents(fact({ type: "RENEWAL" }))).toBe(499);
  });

  it("the website's whole price, because Stripe's ledger holds its fees", () => {
    expect(afterStoreCents(fact({ store: "RC_BILLING", takehome: 0.9 }))).toBe(499);
    expect(afterStoreCents(fact({ store: "STRIPE" }))).toBe(499);
  });

  it("a refund back out once, whether RevenueCat signs it or names it", () => {
    const negative = fact({ type: "CANCELLATION", reason: "CUSTOMER_SUPPORT", price_usd: -4.99 });
    const named = fact({ type: "CANCELLATION", reason: "CUSTOMER_SUPPORT", price_usd: 4.99 });
    expect(isRefund(negative) && isRefund(named)).toBe(true);
    expect(grossCents(negative)).toBe(-499);
    expect(grossCents(named)).toBe(-499);
    expect(grossCents(fact({ type: "REFUND_REVERSED", price_usd: 4.99 }))).toBe(499);
    // Turning renewal off moves no money.
    expect(grossCents(fact({ type: "CANCELLATION", reason: "UNSUBSCRIBE" }))).toBe(0);
  });

  it("nothing for test money, a grant, a free trial, or an event that is not a charge", () => {
    expect(grossCents(fact({ environment: "SANDBOX" }))).toBe(0);
    expect(grossCents(fact({ store: "TEST_STORE" }))).toBe(0);
    expect(grossCents(fact({ store: "PROMOTIONAL" }))).toBe(0);
    expect(grossCents(fact({ period_type: "TRIAL", price_usd: 0 }))).toBe(0);
    expect(grossCents(fact({ type: "PRODUCT_CHANGE" }))).toBe(0);
    expect(grossCents(fact({ type: "BILLING_ISSUE" }))).toBe(0);
    expect(grossCents(fact({ price_usd: null }))).toBe(0);
  });
});

describe("the tally", () => {
  it("joins, trials, trials that paid, trials that ended, leaves, renewals off, failed cards and refunds", () => {
    const t = tally([
      fact({}),
      fact({ user_id: "u2", period_type: "TRIAL", price_usd: 0 }),
      fact({ user_id: "u2", type: "RENEWAL", trial_conversion: true }),
      fact({ user_id: "u3", period_type: "TRIAL", price_usd: 0 }),
      fact({ user_id: "u3", type: "EXPIRATION", period_type: "TRIAL", price_usd: null }),
      fact({ user_id: "u4", type: "EXPIRATION", reason: "UNSUBSCRIBE", price_usd: null }),
      fact({ user_id: "u5", type: "CANCELLATION", reason: "UNSUBSCRIBE" }),
      fact({ user_id: "u6", type: "BILLING_ISSUE" }),
      fact({ user_id: "u6", type: "CANCELLATION", reason: "BILLING_ERROR" }),
      fact({ user_id: "u7", type: "CANCELLATION", reason: "CUSTOMER_SUPPORT", price_usd: -4.99 }),
    ]);
    expect(t).toEqual({
      joined: 2,
      trials: 2,
      trialsPaid: 1,
      trialsEnded: 1,
      left: 1,
      renewalOff: 1,
      cardFailed: 1,
      refunds: 1,
      grossCents: 499 + 499 - 499,
      afterStoreCents: 424 + 424 - 424,
    });
  });

  it("sets his own test purchases and the grants aside, and counts them apart", () => {
    const facts = [fact({ environment: "SANDBOX" }), fact({ store: "TEST_STORE" }), fact({ store: "PROMOTIONAL", price_usd: null })];
    expect(tally(facts).joined).toBe(0);
    expect(setAside(facts)).toEqual({ test: 2, grants: 1 });
  });
});

describe("weeks and days, UTC", () => {
  it("a week starts on Monday", () => {
    expect(weekOf("2026-11-11T15:00:00Z")).toBe("2026-11-09");
    expect(weekOf("2026-11-09T00:00:00Z")).toBe("2026-11-09");
    expect(weekOf("2026-11-08T23:59:59Z")).toBe("2026-11-02");
  });

  it("the last twelve weeks oldest first, each event in its own", () => {
    const weeks = byWeek([fact({}), fact({ event_at: "2026-11-03T08:00:00Z" })], NOW);
    expect(weeks).toHaveLength(12);
    expect(weeks[11]).toMatchObject({ week: "2026-11-09", joined: 1 });
    expect(weeks[10]).toMatchObject({ week: "2026-11-02", joined: 1 });
    expect(weeks[0].week).toBe("2026-08-24");
  });

  it("the last thirty days, a database time with an offset read on its UTC day", () => {
    const days = byDay([fact({ event_at: "2026-11-10T23:30:00-02:00" })], NOW);
    expect(days).toHaveLength(30);
    expect(days[29]).toMatchObject({ day: "2026-11-11", grossCents: 499 });
    expect(days[28].grossCents).toBe(0);
  });

  it("only the app stores, when Stripe's ledger already holds the website", () => {
    const days = byDay([fact({}), fact({ store: "RC_BILLING" })], NOW, 30, (f) => f.store !== "RC_BILLING");
    expect(days[28]).toMatchObject({ day: "2026-11-10", afterStoreCents: 424 });
  });
});

describe("who is in a free trial now", () => {
  it("a member whose latest event is a trial that has not run out", () => {
    const facts = [
      fact({ user_id: "trying", period_type: "TRIAL", price_usd: 0, expires_at: "2026-11-15T00:00:00Z" }),
      fact({ user_id: "off", period_type: "TRIAL", price_usd: 0, expires_at: "2026-11-15T00:00:00Z" }),
      fact({ user_id: "off", type: "CANCELLATION", period_type: "TRIAL", reason: "UNSUBSCRIBE", event_at: "2026-11-11T09:00:00Z", expires_at: "2026-11-15T00:00:00Z" }),
      fact({ user_id: "paid", period_type: "TRIAL", price_usd: 0, event_at: "2026-11-01T00:00:00Z", expires_at: "2026-11-08T00:00:00Z" }),
      fact({ user_id: "paid", type: "RENEWAL", trial_conversion: true, event_at: "2026-11-08T00:00:00Z" }),
      fact({ user_id: "lapsed", period_type: "TRIAL", price_usd: 0, event_at: "2026-11-01T00:00:00Z", expires_at: "2026-11-08T00:00:00Z" }),
      fact({ user_id: "sandbox", period_type: "TRIAL", price_usd: 0, environment: "SANDBOX", expires_at: "2026-11-15T00:00:00Z" }),
    ];
    expect([...inTrialNow(facts, NOW)].sort()).toEqual(["off", "trying"]);
  });
});

describe("Home's takings with Plus from the app stores", () => {
  it("adds each day's store Plus from the first kept event on, never the website's, which Stripe holds", () => {
    const series = [100, 100, 100, 100];
    const facts = [
      fact({ event_at: "2026-11-08T10:00:00Z" }), // before the first kept event: impossible, but never added
      fact({ event_at: "2026-11-10T10:00:00Z" }),
      fact({ event_at: "2026-11-11T09:00:00Z", takehome: 0.7 }),
      fact({ event_at: "2026-11-11T09:30:00Z", store: "RC_BILLING" }),
    ];
    const out = withStorePlus(series, facts, "2026-11-09T12:00:00+00:00", NOW);
    expect(out.series).toEqual([100, 100, 100 + 424, 100 + 349]);
    expect(out.todayCents).toBe(349);
    expect(out.addedCents).toBe(424 + 349);
    expect(series).toEqual([100, 100, 100, 100]);
  });

  it("adds nothing to today before the first kept event", () => {
    const out = withStorePlus([5, 5], [], "2026-11-12T00:00:00Z", NOW);
    expect(out).toEqual({ series: [5, 5], todayCents: 0, addedCents: 0 });
  });
});

