import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/admin/revenue/daily, the real handler over orders held in memory.
 *
 * The fold has its own suite (revenueDaily.test.ts). What only the handler can
 * get wrong is which orders it reads: it makes two reads, one of orders by the
 * day they were paid and one of paid orders with no payment time by the day
 * their checkout started, and an order has to come back from exactly one of
 * them or from neither. The fake keeps the two rules of SQL that decide it: a
 * range filter never matches a null, and `is null` matches nothing else.
 */

type Row = Record<string, unknown>;

const state = vi.hoisted(() => ({
  admin: { email: "owner@example.com" } as { email: string } | null,
  rows: [] as Record<string, unknown>[],
  fail: null as string | null,
  reads: 0,
}));

vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => state.admin }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const tests: ((row: Row) => boolean)[] = [(/* only one table is read */) => table === "shop_orders"];
      const sort: string[] = [];
      let window: [number, number] = [0, Infinity];
      const time = (v: unknown) => Date.parse(String(v));
      const query = {
        select: () => query,
        in: (column: string, values: readonly unknown[]) => (tests.push((r) => values.includes(r[column])), query),
        is: (column: string, value: null) => (tests.push((r) => (r[column] ?? null) === value), query),
        gte: (column: string, value: string) => (tests.push((r) => r[column] != null && time(r[column]) >= time(value)), query),
        lt: (column: string, value: string) => (tests.push((r) => r[column] != null && time(r[column]) < time(value)), query),
        order: (column: string) => (sort.push(column), query),
        range: (from: number, to: number) => ((window = [from, to]), query),
        then: <T>(resolve: (result: { data: Row[] | null; error: { message: string } | null }) => T) => {
          state.reads++;
          if (state.fail) return Promise.resolve({ data: null, error: { message: state.fail } }).then(resolve);
          const hit = state.rows
            .filter((r) => tests.every((test) => test(r)))
            .sort((a, b) => {
              for (const c of sort) {
                const d = String(a[c]).localeCompare(String(b[c]));
                if (d !== 0) return d;
              }
              return 0;
            });
          // The server's own cap: 1,000 rows a request, whatever was asked for.
          const page = hit.slice(window[0], Math.min(window[1], window[0] + 999) + 1);
          return Promise.resolve({ data: page, error: null }).then(resolve);
        },
      };
      return query;
    },
  }),
}));

import { GET } from "@/app/api/admin/revenue/daily/route";

type Day = { date: string; netCents: number; orderCount: number; byCheckoutStart: number };

let nextId = 0;
function order(over: Row = {}): Row {
  nextId++;
  return {
    id: `order-${String(nextId).padStart(5, "0")}`,
    total_cents: 1998,
    payment_status: "paid",
    // The route header's example: opened at 23:50 UTC on the 17th, paid on the 18th.
    created_at: "2026-09-17T23:50:00.123456+00:00",
    paid_at: "2026-09-18T00:04:10+00:00",
    ...over,
  };
}

async function daily(from: string, to: string) {
  const res = await GET(new NextRequest(`https://purifyapp.net/api/admin/revenue/daily?from=${from}&to=${to}`));
  const body = await res.json();
  const on = (date: string) => (body.days as Day[]).find((d) => d.date === date)!;
  return { res, body, on };
}

beforeEach(() => {
  state.admin = { email: "owner@example.com" };
  state.rows = [];
  state.fail = null;
  state.reads = 0;
  nextId = 0;
});

describe("GET /api/admin/revenue/daily", () => {
  it("puts an order on the day it was paid, and names the basis", async () => {
    state.rows = [order()];
    const { res, body, on } = await daily("2026-09-17", "2026-09-18");

    expect(res.status).toBe(200);
    expect(body.basis).toBe("shop_orders.paid_at");
    expect(on("2026-09-18")).toEqual({ date: "2026-09-18", netCents: 1998, orderCount: 1, byCheckoutStart: 0 });
    expect(on("2026-09-17")).toEqual({ date: "2026-09-17", netCents: 0, orderCount: 0, byCheckoutStart: 0 });
    expect(body.byCheckoutStart).toBe(0);
  });

  it("counts an order paid inside the range though its checkout opened before it", async () => {
    state.rows = [order()];
    const { on } = await daily("2026-09-18", "2026-09-18");
    expect(on("2026-09-18").orderCount).toBe(1);
  });

  it("does not count an order on the day its checkout opened once it has a payment time", async () => {
    // What the old basis did: asked for the 17th alone, it counted this order
    // there, though the money came on the 18th.
    state.rows = [order()];
    const { body, on } = await daily("2026-09-17", "2026-09-17");
    expect(on("2026-09-17").orderCount).toBe(0);
    expect(body.days).toHaveLength(1);
  });

  it("keeps a paid order with no payment time, on its checkout day, and reports it", async () => {
    state.rows = [order({ paid_at: null }), order({ created_at: "2026-09-17T09:00:00+00:00", paid_at: "2026-09-17T09:02:00+00:00" })];
    const { body, on } = await daily("2026-09-17", "2026-09-18");

    expect(on("2026-09-17")).toEqual({ date: "2026-09-17", netCents: 3996, orderCount: 2, byCheckoutStart: 1 });
    expect(on("2026-09-18").orderCount).toBe(0);
    expect(body.byCheckoutStart).toBe(1);
  });

  it("counts every paid order in the range once, and nothing that was not paid", async () => {
    state.rows = [
      order(), // paid on the 18th
      order({ paid_at: null }), // no time: the 17th, by checkout start
      order({ payment_status: "refunded" }), // the 18th, worth nothing
      order({ payment_status: "pending", paid_at: null }),
      order({ payment_status: "cancelled", paid_at: null }),
      order({ payment_status: "cancelled" }), // paid, then cancelled by hand
      order({ paid_at: "2026-09-19T00:00:00+00:00" }), // paid the day after the range
      order({ created_at: "2026-09-16T23:59:59+00:00", paid_at: null }), // opened the day before it
    ];
    const { body, on } = await daily("2026-09-17", "2026-09-18");

    expect(on("2026-09-17")).toEqual({ date: "2026-09-17", netCents: 1998, orderCount: 1, byCheckoutStart: 1 });
    expect(on("2026-09-18")).toEqual({ date: "2026-09-18", netCents: 1998, orderCount: 2, byCheckoutStart: 0 });
    expect((body.days as Day[]).reduce((n, d) => n + d.orderCount, 0)).toBe(3);
  });

  it("reads past the 1,000 rows one request returns", async () => {
    // F-31 was this: a read that stopped at 1,000 and called it everything.
    state.rows = Array.from({ length: 1500 }, () => order());
    const { body, on } = await daily("2026-09-18", "2026-09-18");

    expect(on("2026-09-18").orderCount).toBe(1500);
    expect(on("2026-09-18").netCents).toBe(1500 * 1998);
    expect(body.truncated).toBe(false);
  });

  it("answers 500 when the orders cannot be read, not a calendar of zeros", async () => {
    state.fail = "connection refused";
    const { res, body } = await daily("2026-09-17", "2026-09-18");
    expect(res.status).toBe(500);
    expect(body).toEqual({ error: "Could not read orders", detail: "connection refused" });
  });

  it("refuses anyone who is not an admin before reading anything", async () => {
    state.admin = null;
    state.rows = [order()];
    const { res } = await daily("2026-09-17", "2026-09-18");
    expect(res.status).toBe(403);
    expect(state.reads).toBe(0);
  });
});
