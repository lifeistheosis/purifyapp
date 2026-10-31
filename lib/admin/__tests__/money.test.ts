import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  goodsAtCost,
  moneyFigures,
  moneyWindow,
  plusAfterCut,
  shopBuckets,
  shopNet,
  STORE_CUT,
  type MoneyOrder,
} from "../money";

// Money: the owner's pick A on sheet r3-15 (2026-10-30), came in, went out,
// kept, with estimates marked and donations apart (lib/admin/profit.ts).

const order = (cents: number, status: string, paid: string | null, items: [string | null, number][] = []): MoneyOrder => ({
  total_cents: cents,
  payment_status: status,
  created_at: paid ?? "2026-10-02T10:00:00Z",
  paid_at: paid,
  items: items.map(([product_id, quantity]) => ({ product_id, quantity })),
});

describe("the period", () => {
  const now = new Date("2026-10-30T09:41:00Z");

  it("is the month so far, against the whole month before", () => {
    const w = moneyWindow("month", now);
    expect(w).toMatchObject({ label: "October", beforeLabel: "September", months: 1, buckets: "day" });
    expect(w.since).toBe("2026-10-01T00:00:00.000Z");
    expect(w.beforeSince).toBe("2026-09-01T00:00:00.000Z");
    expect(moneyWindow("month", new Date("2026-01-15T00:00:00Z")).beforeLabel).toBe("December");
  });

  it("counts whole days, and months for the monthly costs", () => {
    const w = moneyWindow("30d", now);
    expect(w.since).toBe("2026-10-01T00:00:00.000Z");
    expect(w.beforeSince).toBe("2026-09-01T00:00:00.000Z");
    expect(moneyWindow("90d", now).months).toBe(3);
    const y = moneyWindow("12m", now);
    expect(y).toMatchObject({ months: 12, buckets: "month", since: "2025-11-01T00:00:00.000Z" });
  });
});

describe("the parts", () => {
  it("counts the shop paid less refunds", () => {
    expect(shopNet([order(4200, "paid", "2026-10-30T09:38:00Z"), order(1600, "refunded", "2026-10-29T23:15:00Z")])).toEqual({
      netCents: 4200,
      paid: 1,
      refunded: 1,
    });
  });

  it("costs the goods from Catalogue, and never prices an unknown one at zero", () => {
    const g = goodsAtCost(
      [
        order(4200, "paid", "2026-10-30T09:38:00Z", [
          ["rope", 2],
          ["cross", 1],
        ]),
        order(1600, "refunded", "2026-10-29T23:15:00Z", [["rope", 5]]),
        order(900, "paid", "2026-10-29T08:00:00Z", [[null, 1]]),
      ],
      new Map<string, number | null>([
        ["rope", 216],
        ["cross", null],
      ]),
    );
    expect(g).toEqual({ cents: 432, units: 4, unknownUnits: 2 });
  });

  it("takes the stores' cut from the members who pay through a store only", () => {
    expect(STORE_CUT).toBe(0.15);
    expect(plusAfterCut(10_000, 1, 1)).toBe(8_500);
    expect(plusAfterCut(10_000, 1, 0)).toBe(10_000);
    expect(plusAfterCut(10_000, 3, 0.5)).toBe(27_750);
  });
});

describe("came in, went out, kept", () => {
  it("adds up as the sheet drew it, and marks the estimate", () => {
    const f = moneyFigures({
      shopCents: 429_600,
      plusCents: 115_400,
      costLinesCents: 48_600,
      goodsCents: 131_000,
      goodsUnknownUnits: 0,
      feesCents: 14_200,
    });
    expect(f.cameIn).toEqual({ cents: 545_000, estimated: true, missing: [] });
    expect(f.wentOut).toEqual({ cents: 193_800, missing: [] });
    expect(f.kept).toEqual({ cents: 351_200, estimated: true, pctOfCameIn: 64 });
  });

  it("is realized when no Plus is in it", () => {
    const f = moneyFigures({ shopCents: 5_000, plusCents: 0, costLinesCents: 1_000, goodsCents: 1_000, goodsUnknownUnits: 0, feesCents: 200 });
    expect(f.cameIn.estimated).toBe(false);
    expect(f.kept).toEqual({ cents: 2_800, estimated: false, pctOfCameIn: 56 });
  });

  it("says what a total is missing instead of counting it as nothing", () => {
    const f = moneyFigures({ shopCents: 5_000, plusCents: null, costLinesCents: 1_000, goodsCents: 1_000, goodsUnknownUnits: 3, feesCents: null });
    expect(f.cameIn.missing).toEqual(["Plus"]);
    expect(f.wentOut.missing).toEqual(["Stripe's fees", "3 items with no cost in Catalogue"]);
    expect(f.kept.estimated).toBe(true);
  });

  it("has no figure at all when the shop could not be read", () => {
    const f = moneyFigures({ shopCents: null, plusCents: 100, costLinesCents: 100, goodsCents: 100, goodsUnknownUnits: 0, feesCents: 100 });
    expect(f.cameIn.cents).toBeNull();
    expect(f.kept.cents).toBeNull();
    expect(f.kept.pctOfCameIn).toBeNull();
  });
});

describe("the shop's days", () => {
  it("lays the month's days beside the month before's", () => {
    const now = new Date("2026-10-03T12:00:00Z");
    const w = moneyWindow("month", now);
    const b = shopBuckets(
      [
        order(1000, "paid", "2026-10-01T05:00:00Z"),
        order(500, "paid", "2026-10-03T08:00:00Z"),
        order(700, "refunded", "2026-10-03T09:00:00Z"),
        order(300, "paid", "2026-09-30T23:59:00Z"),
      ],
      w,
      now,
    );
    expect(b.current).toEqual([1000, 0, 500]);
    expect(b.before.length).toBe(30);
    expect(b.before[29]).toBe(300);
  });

  it("lays twelve months beside the twelve before", () => {
    const now = new Date("2026-10-30T09:41:00Z");
    const b = shopBuckets([order(1000, "paid", "2026-10-02T00:00:00Z"), order(400, "paid", "2025-10-02T00:00:00Z")], moneyWindow("12m", now), now);
    expect(b.current.length).toBe(12);
    expect(b.current[11]).toBe(1000);
    expect(b.before[11]).toBe(400);
  });
});

// ── The route ─────────────────────────────────────────────────────────────

type Answer = { data: unknown; error: { message: string } | null; count?: number | null };

const state = vi.hoisted(() => ({
  admin: { email: "owner@example.com" } as { email: string } | null,
  tables: {} as Record<string, Answer>,
  stats: null as null | Record<string, unknown>,
  ledger: { configured: false, error: null, rows: [] as unknown[] } as Record<string, unknown>,
  reads: 0,
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/entitlements/adminStats", () => ({
  subscriptionStats: async () => {
    if (!state.stats) throw new Error("no entitlements");
    return state.stats;
  },
}));
vi.mock("@/lib/billing/stripeLedger", async (orig) => ({
  ...(await orig<typeof import("@/lib/billing/stripeLedger")>()),
  cachedLedger: async () => state.ledger,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      state.reads++;
      let window: [number, number] = [0, Infinity];
      const query: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "or", "gte", "order"]) query[m] = () => query;
      query.range = (from: number, to: number) => ((window = [from, to]), query);
      query.then = <T>(resolve: (a: Answer) => T) => {
        const a = state.tables[table] ?? { data: [], error: null, count: 0 };
        const data = Array.isArray(a.data) ? a.data.slice(window[0], window[1] + 1) : a.data;
        return Promise.resolve({ ...a, data }).then(resolve);
      };
      return query;
    },
  }),
}));

import { GET } from "@/app/api/admin/money/route";

describe("/api/admin/money", () => {
  beforeEach(() => {
    state.admin = { email: "owner@example.com" };
    state.reads = 0;
    state.stats = {
      bySource: { google: 3, comp: 2 },
      paidCounts: { plusOnly: 2, pro: 1 },
      paidPlus: 3,
      compedPlus: 2,
      giftedPlus: 0,
      legacyPlus: 0,
    };
    state.ledger = { configured: false, error: null, rows: [] };
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-30T09:41:00Z"));
    state.tables = {
      shop_orders: {
        data: [
          { email: "ann@example.com", total_cents: 4200, payment_status: "paid", created_at: "2026-10-30T09:37:00Z", paid_at: "2026-10-30T09:38:00Z", items: [{ product_id: "rope", quantity: 2 }] },
          { email: "c@example.com", total_cents: 1600, payment_status: "refunded", created_at: "2026-10-29T23:15:00Z", paid_at: null, items: [] },
          { email: "old@example.com", total_cents: 900, payment_status: "paid", created_at: "2026-09-12T10:00:00Z", paid_at: "2026-09-12T10:01:00Z", items: [] },
        ],
        error: null,
        count: 1,
      },
      shop_product_sourcing: { data: [{ product_id: "rope", supplier_cost_cents: 216 }], error: null },
      expense_lines: { data: [{ monthly_cents: 48_600, active: true }, { monthly_cents: 999, active: false }], error: null },
      donations_monthly: { data: [{ year_month: "2026-10", total_cents: 41_200, goal_cents: 60_000 }], error: null },
    };
  });

  it("answers 403 to anyone who is not an admin, and reads nothing", async () => {
    state.admin = null;
    const res = await GET(new NextRequest("http://x/api/admin/money"));
    expect(res.status).toBe(403);
    expect(state.reads).toBe(0);
  });

  it("answers came in, went out and kept, with the estimate and the gaps named", async () => {
    const res = await GET(new NextRequest("http://x/api/admin/money?period=month"));
    const body = (await res.json()) as Record<string, Record<string, unknown>>;
    expect(res.status).toBe(200);
    expect(body.label).toBe("October");
    // The shop: October's paid order only; the refunded one counts nothing.
    expect(body.cameIn.shopCents).toBe(4200);
    // Plus: 2 Plus and 1 Pro at list price, all through a store, less 15%.
    expect(body.cameIn.estimated).toBe(true);
    expect(body.wentOut.goodsCents).toBe(432);
    expect(body.wentOut.costLinesCents).toBe(48_600);
    expect(body.wentOut.feesCents).toBeNull();
    expect(body.wentOut.stripeNote).toBe("Stripe is not connected on this server");
    expect(body.unread).toContain("Stripe's fees");
    expect(body.kept.estimated).toBe(true);
    // Donations apart, and in no total.
    expect(body.donations).toMatchObject({ cents: 41_200, goalCents: 60_000 });
    expect((body.cameIn.cents as number) - 4200).toBe(body.cameIn.plusCents);
    expect(body.lines.revenue).toEqual({ paidOrders: 1, averageCents: 4200, refunds: 1, openCheckouts: 1 });
    expect(body.lines.subscriptions).toEqual({ paying: 3, pro: 1, comped: 2, gifted: 0, grandfathered: 0 });
  });

  it("names who pays for Plus as unread when entitlements do not answer, and still counts the rest", async () => {
    state.stats = null;
    const res = await GET(new NextRequest("http://x/api/admin/money?period=30d"));
    const body = (await res.json()) as Record<string, Record<string, unknown>>;
    expect(body.cameIn.plusCents).toBeNull();
    expect(body.unread).toContain("who pays for Plus");
    expect(body.cameIn.shopCents).toBe(4200);
  });
});
