// The Monday email's reads and its send, over a database held in memory.
// What only the server half can get wrong: which rows it counts for which
// week, that a failed read leaves its figure unread instead of failing the
// letter, and that it goes on Mondays, once a week, to the owner alone.

import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  failing: new Set<string>(),
  buckets: [] as Row[],
  bucketsFail: false,
  sent: [] as Record<string, unknown>[],
  rc: null as null | { mrr: number; activeSubscriptions: number; activeTrials: number },
  rcRange: {} as Record<string, number>,
}));

vi.mock("@/lib/email/ledger", () => ({
  sendEmailOnce: async (_admin: unknown, msg: Record<string, unknown>) => {
    state.sent.push(msg);
    return { status: "sent" };
  },
}));
vi.mock("@/lib/billing/revenuecatMetrics", () => ({
  getProjectMetrics: async () => state.rc,
  getRevenueBetween: async (start: string, end: string) => {
    const v = state.rcRange[`${start}..${end}`];
    return v === undefined ? null : { value: v, currency: "USD", startDate: start, endDate: end };
  },
}));
vi.mock("@/lib/entitlements/adminStats", () => ({
  subscriptionStats: async () => ({ paidPlus: 5, paidCounts: { plusOnly: 4, pro: 1 } }),
}));

import { readWeek, sendWeeklyLetter } from "../weeklyLetter";
import { lastWeek } from "../weekly";

/** A query that keeps the filters it is given and answers from `rows`. */
function fakeDb() {
  return {
    rpc: async (name: string) => {
      expect(name).toBe("analytics_daily_buckets");
      return state.bucketsFail ? { data: null, error: { message: "timeout" } } : { data: state.buckets, error: null };
    },
    from(table: string) {
      const tests: ((r: Row) => boolean)[] = [];
      let head = false;
      let window: [number, number] = [0, Infinity];
      const q = {
        select: (_c: string, opts?: { head?: boolean }) => ((head = !!opts?.head), q),
        eq: (c: string, v: unknown) => (tests.push((r) => r[c] === v), q),
        in: (c: string, vs: unknown[]) => (tests.push((r) => vs.includes(r[c])), q),
        gte: (c: string, v: string) => (tests.push((r) => String(r[c]) >= v), q),
        lt: (c: string, v: string) => (tests.push((r) => String(r[c]) < v), q),
        // The shop's window: paid in it, or with no payment time and begun in it.
        or: (expr: string) => {
          const [from, to] = [...expr.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
          tests.push((r) => {
            const t = (r.paid_at ?? r.created_at) as string;
            return t >= from && t < to;
          });
          return q;
        },
        order: () => q,
        range: (a: number, b: number) => ((window = [a, b]), q),
        then: <T>(resolve: (v: { data: Row[] | null; count: number | null; error: { message: string } | null }) => T) => {
          if (state.failing.has(table)) return Promise.resolve({ data: null, count: null, error: { message: "boom" } }).then(resolve);
          const hit = (state.tables[table] ?? []).filter((r) => tests.every((t) => t(r)));
          return Promise.resolve({
            data: head ? null : hit.slice(window[0], window[1] + 1),
            count: head ? hit.length : null,
            error: null,
          }).then(resolve);
        },
      };
      return q;
    },
  } as never;
}

const MONDAY = new Date("2026-11-09T13:05:00Z");
const W = lastWeek(MONDAY);

beforeEach(() => {
  state.tables = {};
  state.failing = new Set();
  state.buckets = [];
  state.bucketsFail = false;
  state.sent = [];
  state.rc = null;
  state.rcRange = {};
  process.env.ADMIN_EMAILS = "owner@example.com, second@example.com";
});

describe("readWeek", () => {
  it("counts each week's days, orders and locks in their own week", async () => {
    state.buckets = [
      { day: "2026-10-27", visitors: "100", views: "900", signups: "5" },
      { day: "2026-11-02", visitors: "150", views: "1000", signups: "8" },
      { day: "2026-11-08", visitors: "50", views: "500", signups: "2" },
    ];
    state.tables.shop_orders = [
      { id: "a", total_cents: 4000, payment_status: "paid", created_at: "2026-11-03T10:00:00Z", paid_at: "2026-11-03T10:01:00Z", fulfillment_status: "shipped" },
      { id: "b", total_cents: 1000, payment_status: "refunded", created_at: "2026-11-04T10:00:00Z", paid_at: "2026-11-04T10:01:00Z" },
      { id: "c", total_cents: 2000, payment_status: "paid", created_at: "2026-10-28T10:00:00Z", paid_at: null, fulfillment_status: "packaged" },
      // Paid the Monday it is sent: next week's.
      { id: "d", total_cents: 9999, payment_status: "paid", created_at: "2026-11-09T01:00:00Z", paid_at: "2026-11-09T01:00:00Z", fulfillment_status: "pending" },
    ];
    state.tables.shop_refund_requests = [
      { order_id: "a", amount_cents: 500, status: "processed" },
      { order_id: "c", amount_cents: 300, status: "requested" },
    ];
    state.tables.analytics_events = [
      { name: "lock_tapped", props: { lock: "wordstudy" }, ts: "2026-11-03T00:00:00Z" },
      { name: "lock_tapped", props: { lock: "wordstudy" }, ts: "2026-11-05T00:00:00Z" },
      { name: "plus_bought", props: { lock: "wordstudy", plan: "yearly" }, ts: "2026-11-05T00:00:00Z" },
      { name: "lock_tapped", props: { lock: "journal" }, ts: "2026-11-06T00:00:00Z" },
      { name: "lock_tapped", props: { lock: "journal" }, ts: "2026-10-30T00:00:00Z" },
    ];
    state.tables.support_tickets = [{ id: 1, status: "open" }, { id: 2, status: "closed" }];
    const f = await readWeek(fakeDb(), W);

    expect(f.visitors).toEqual({ now: 200, before: 100 });
    expect(f.views).toEqual({ now: 1500, before: 900 });
    expect(f.signups).toEqual({ now: 10, before: 5 });
    // a: 4000 less its 500 refund; b refunded; d belongs to the next week; c is the week before.
    expect(f.shop).toEqual({ cents: { now: 3500, before: 2000 }, orders: { now: 1, before: 1 } });
    expect(f.locks?.taps).toBe(3);
    expect(f.locks?.bought).toBe(1);
    expect(f.locks?.top[0]).toEqual({ name: "Word study", taps: 2, bought: 1 });
    expect(f.waiting).toEqual({ messages: 1, refunds: 1, toPost: 2 });
    // No RevenueCat: the estimate, from who pays now.
    expect(f.plus).toMatchObject({ paidCents: null, paying: 5, trials: null, source: "estimate" });
  });

  it("takes Plus from RevenueCat when it answers", async () => {
    state.rc = { mrr: 199.84, activeSubscriptions: 13, activeTrials: 3 };
    state.rcRange[`${W.start}..${W.end}`] = 120.5;
    state.rcRange[`${W.priorStart}..${W.priorEnd}`] = 100;
    const f = await readWeek(fakeDb(), W);
    expect(f.plus).toEqual({ paidCents: { now: 12_050, before: 10_000 }, paying: 13, trials: 3, mrrCents: 19_984, source: "revenuecat" });
  });

  it("leaves a figure unread when its read fails, and reads the rest", async () => {
    state.bucketsFail = true;
    state.failing = new Set(["shop_orders", "support_tickets"]);
    const f = await readWeek(fakeDb(), W);
    expect(f.visitors).toBeNull();
    expect(f.shop).toBeNull();
    expect(f.waiting.messages).toBeNull();
    expect(f.waiting.refunds).toBe(0);
    expect(f.locks).toEqual({ top: [], taps: 0, bought: 0 });
  });
});

describe("sendWeeklyLetter", () => {
  it("sends on Monday to the first admin address, keyed by the week so it goes once", async () => {
    const r = await sendWeeklyLetter(fakeDb(), MONDAY);
    expect(r).toEqual({ sent: true, reason: "sent", week: "2 to 8 November" });
    expect(state.sent).toHaveLength(1);
    expect(state.sent[0]).toMatchObject({ dedupeKey: "weekly_letter:2026-11-09", kind: "weekly_letter", userId: null, to: "owner@example.com" });
    expect(String(state.sent[0].subject)).toMatch(/^Your week, 2 to 8 November/);
  });

  it("sends nothing on another day", async () => {
    expect(await sendWeeklyLetter(fakeDb(), new Date("2026-11-10T13:05:00Z"))).toEqual({ sent: false, reason: "not Monday" });
    expect(state.sent).toHaveLength(0);
  });

  it("can be sent by hand on another day, still keyed by its week", async () => {
    await sendWeeklyLetter(fakeDb(), new Date("2026-11-11T09:00:00Z"), { force: true });
    expect(state.sent[0]?.dedupeKey).toBe("weekly_letter:2026-11-09");
  });

  it("sends nothing without an admin address", async () => {
    process.env.ADMIN_EMAILS = "";
    expect(await sendWeeklyLetter(fakeDb(), MONDAY)).toEqual({ sent: false, reason: "ADMIN_EMAILS unset" });
    expect(state.sent).toHaveLength(0);
  });
});
