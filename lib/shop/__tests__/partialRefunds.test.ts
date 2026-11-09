// A partial refund leaves its order marked paid, so every revenue figure has
// to take the refunded part off itself. These hold the arithmetic.

import { describe, expect, it } from "vitest";
import { keptCents, paidTotals, partlyRefundedCents, refundsByOrder, sumRefunds } from "../partialRefunds";

describe("keptCents", () => {
  const refunds = new Map([
    ["a", 1500],
    ["b", 9000],
  ]);

  it("takes a partial refund off a paid order", () => {
    expect(keptCents({ id: "a", total_cents: 4000, payment_status: "paid" }, refunds)).toBe(2500);
  });

  it("never goes below zero when the refunds reach the whole order", () => {
    expect(keptCents({ id: "b", total_cents: 4000, payment_status: "paid" }, refunds)).toBe(0);
  });

  it("counts a refunded, pending or cancelled order as nothing", () => {
    expect(keptCents({ id: "a", total_cents: 4000, payment_status: "refunded" }, refunds)).toBe(0);
    expect(keptCents({ id: "a", total_cents: 4000, payment_status: "pending" }, refunds)).toBe(0);
    expect(keptCents({ id: "a", total_cents: 4000, payment_status: "cancelled" }, refunds)).toBe(0);
  });

  it("keeps the whole total when there is no refund, or no map", () => {
    expect(keptCents({ id: "c", total_cents: 4000, payment_status: "paid" }, refunds)).toBe(4000);
    expect(keptCents({ id: "a", total_cents: 4000, payment_status: "paid" })).toBe(4000);
    expect(keptCents({ total_cents: 4000, payment_status: "paid" }, refunds)).toBe(4000);
  });

  it("names the refunded part, clamped to the total", () => {
    expect(partlyRefundedCents({ id: "a", total_cents: 4000, payment_status: "paid" }, refunds)).toBe(1500);
    expect(partlyRefundedCents({ id: "b", total_cents: 4000, payment_status: "paid" }, refunds)).toBe(4000);
    expect(partlyRefundedCents({ id: "a", total_cents: 4000, payment_status: "refunded" }, refunds)).toBe(0);
  });
});

describe("sumRefunds", () => {
  it("adds every processed refund on an order", () => {
    const m = sumRefunds([
      { order_id: "a", amount_cents: 500 },
      { order_id: "a", amount_cents: 700 },
      { order_id: "b", amount_cents: 100 },
    ]);
    expect(m.get("a")).toBe(1200);
    expect(m.get("b")).toBe(100);
  });

  it("reads a row with no amount as the whole order, the refund code's own default", () => {
    const m = sumRefunds([{ order_id: "a", amount_cents: null }], (id) => (id === "a" ? 4000 : undefined));
    expect(m.get("a")).toBe(4000);
  });

  it("skips a row it cannot place", () => {
    const m = sumRefunds([
      { order_id: null, amount_cents: 500 },
      { order_id: "z", amount_cents: null },
    ]);
    expect(m.size).toBe(0);
  });
});

describe("paidTotals", () => {
  it("asks only about paid orders with an id", () => {
    const m = paidTotals([
      { id: "a", total_cents: 100, payment_status: "paid" },
      { id: "b", total_cents: 200, payment_status: "refunded" },
      { total_cents: 300, payment_status: "paid" },
    ]);
    expect([...m.entries()]).toEqual([["a", 100]]);
  });
});

describe("refundsByOrder", () => {
  type Call = { status?: string; ids?: string[] };

  function fakeDb(rows: { order_id: string; amount_cents: number | null; status: string }[], fail = false) {
    const calls: Call[] = [];
    const db = {
      from(table: string) {
        expect(table).toBe("shop_refund_requests");
        const call: Call = {};
        calls.push(call);
        const q = {
          select() {
            return q;
          },
          eq(col: string, v: string) {
            if (col === "status") call.status = v;
            return q;
          },
          in(_col: string, ids: string[]) {
            call.ids = ids;
            if (fail) return Promise.resolve({ data: null, error: { message: "boom" } });
            return Promise.resolve({
              data: rows.filter((r) => r.status === call.status && ids.includes(r.order_id)),
              error: null,
            });
          },
        };
        return q;
      },
    };
    return { db: db as never, calls };
  }

  it("reads only processed refunds, for the orders asked, in pages of a hundred", async () => {
    const totals = new Map<string, number>();
    for (let i = 0; i < 150; i++) totals.set(`o${i}`, 1000);
    const { db, calls } = fakeDb([
      { order_id: "o1", amount_cents: 300, status: "processed" },
      { order_id: "o1", amount_cents: 999, status: "requested" },
      { order_id: "o149", amount_cents: null, status: "processed" },
    ]);
    const m = await refundsByOrder(db, totals);
    expect(calls).toHaveLength(2);
    expect(calls.every((c) => c.status === "processed")).toBe(true);
    expect(m?.get("o1")).toBe(300);
    expect(m?.get("o149")).toBe(1000);
  });

  it("answers null, never an empty map, when the read fails", async () => {
    const { db } = fakeDb([], true);
    expect(await refundsByOrder(db, new Map([["a", 100]]))).toBeNull();
  });

  it("asks nothing when there is nothing to ask about", async () => {
    const { db, calls } = fakeDb([]);
    expect((await refundsByOrder(db, new Map()))?.size).toBe(0);
    expect(calls).toHaveLength(0);
  });
});
