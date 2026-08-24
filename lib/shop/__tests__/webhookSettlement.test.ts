import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  amountsMatch,
  settleCheckoutSession,
  type SessionLike,
  type SettlementDb,
} from "@/lib/shop/webhookSettlement";

// Audit F-01 (payment wins over cancellation) and F-03 (amount verification):
// the settlement rules for real money, tested against an injected fake DB.

type OrderRow = {
  id: string;
  payment_status: string;
  total_cents: number;
  currency: string;
  email: string | null;
};

function session(over: Partial<SessionLike> = {}): SessionLike {
  return {
    client_reference_id: "order-1",
    amount_total: 5399,
    currency: "usd",
    customer_details: { email: "buyer@example.com" },
    payment_intent: "pi_123",
    ...over,
  };
}

/** In-memory stand-in for the admin client: one orders row, guarded updates. */
function fakeDb(order: OrderRow | null) {
  const state = { order, rpcCalls: 0, itemsQueried: 0 };
  const db: SettlementDb = {
    from(table: string) {
      return {
        select() {
          return {
            eq(_col: string, val: unknown) {
              const result =
                table === "shop_orders"
                  ? {
                      data:
                        state.order && state.order.id === val
                          ? { ...state.order }
                          : null,
                      error: null,
                    }
                  : ((state.itemsQueried++),
                    {
                      data: [
                        { title: "Icon", quantity: 1, unit_price_cents: 4900 },
                      ],
                      error: null,
                    });
              return Object.assign(
                Promise.resolve(result) as Promise<never>,
                { maybeSingle: () => Promise.resolve(result) },
              );
            },
          };
        },
        update(values: Record<string, unknown>) {
          return {
            eq(_c1: string, id: unknown) {
              return {
                eq(_c2: string, priorStatus: unknown) {
                  return {
                    select() {
                      return {
                        maybeSingle: async () => {
                          if (
                            state.order &&
                            state.order.id === id &&
                            state.order.payment_status === priorStatus
                          ) {
                            state.order = {
                              ...state.order,
                              ...(values as Partial<OrderRow>),
                            };
                            return { data: { ...state.order }, error: null };
                          }
                          return { data: null, error: null };
                        },
                      };
                    },
                  };
                },
              };
            },
          };
        },
      } as unknown as ReturnType<SettlementDb["from"]>;
    },
    rpc() {
      state.rpcCalls++;
      return Promise.resolve({ error: null });
    },
  };
  return { db, state };
}

describe("amountsMatch (F-03)", () => {
  const order = { total_cents: 5399, currency: "usd" };
  it("matches equal totals, case-insensitive currency", () => {
    expect(amountsMatch(order, session({ currency: "USD" }))).toBe(true);
  });
  it("rejects a different total", () => {
    expect(amountsMatch(order, session({ amount_total: 4900 }))).toBe(false);
  });
  it("rejects a different currency", () => {
    expect(amountsMatch(order, session({ currency: "eur" }))).toBe(false);
  });
  it("fails closed on missing amount or currency", () => {
    expect(amountsMatch(order, session({ amount_total: null }))).toBe(false);
    expect(amountsMatch(order, session({ currency: null }))).toBe(false);
  });
});

describe("settleCheckoutSession", () => {
  const email = vi.fn(() => Promise.resolve());
  beforeEach(() => email.mockClear());

  function pendingOrder(): OrderRow {
    return {
      id: "order-1",
      payment_status: "pending",
      total_cents: 5399,
      currency: "usd",
      email: null,
    };
  }

  it("(a) marks a pending order paid and fires effects exactly once", async () => {
    const { db, state } = fakeDb(pendingOrder());
    const result = await settleCheckoutSession(db, email, session());
    expect(result).toBe("paid");
    expect(state.order?.payment_status).toBe("paid");
    expect(state.rpcCalls).toBe(1);
    expect(email).toHaveBeenCalledTimes(1);
  });

  it("(b) is a no-op on webhook retry (already paid): no effects", async () => {
    const { db, state } = fakeDb({ ...pendingOrder(), payment_status: "paid" });
    const result = await settleCheckoutSession(db, email, session());
    expect(result).toBe("retry-noop");
    expect(state.rpcCalls).toBe(0);
    expect(email).not.toHaveBeenCalled();
  });

  it("(c) recovers a cancelled order when payment completed: payment wins (F-01)", async () => {
    const { db, state } = fakeDb({
      ...pendingOrder(),
      payment_status: "cancelled",
    });
    const result = await settleCheckoutSession(db, email, session());
    expect(result).toBe("recovered");
    expect(state.order?.payment_status).toBe("paid");
    expect(state.rpcCalls).toBe(1);
    expect(email).toHaveBeenCalledTimes(1);
  });

  it("(d) refuses to mark paid on amount mismatch (F-03): no update, no effects", async () => {
    const { db, state } = fakeDb(pendingOrder());
    const result = await settleCheckoutSession(
      db,
      email,
      session({ amount_total: 100 }),
    );
    expect(result).toBe("amount-mismatch");
    expect(state.order?.payment_status).toBe("pending");
    expect(state.rpcCalls).toBe(0);
    expect(email).not.toHaveBeenCalled();
  });

  it("(e) unknown order id settles as order-missing", async () => {
    const { db } = fakeDb(null);
    expect(await settleCheckoutSession(db, email, session())).toBe(
      "order-missing",
    );
  });

  it("(f) refunded orders are never re-marked", async () => {
    const { db, state } = fakeDb({
      ...pendingOrder(),
      payment_status: "refunded",
    });
    expect(await settleCheckoutSession(db, email, session())).toBe(
      "ignored-status",
    );
    expect(state.order?.payment_status).toBe("refunded");
  });

  it("(g) sequential double delivery fires effects once total", async () => {
    const { db, state } = fakeDb(pendingOrder());
    expect(await settleCheckoutSession(db, email, session())).toBe("paid");
    expect(await settleCheckoutSession(db, email, session())).toBe(
      "retry-noop",
    );
    expect(state.rpcCalls).toBe(1);
    expect(email).toHaveBeenCalledTimes(1);
  });
});

/**
 * Stock goes down when something sells, and units_sold keeps working while the
 * migration that makes that possible is still only merged.
 *
 * quantity_available was decorative: checkout refused an order that exceeded
 * it, the console rendered it, and the only one-time paid effect
 * (shop_increment_units_sold) bumped a counter and left stock alone. A
 * ready-to-ship listing with one item could be sold without limit, which
 * becomes real the first time an independent seller lists a one-off.
 */
describe("paid inventory effects", () => {
  const email = vi.fn(() => Promise.resolve());

  /** Records which RPCs were called, and can make any of them fail. */
  function rpcSpyDb(
    order: OrderRow,
    fail: (fn: string) => { message: string; code?: string } | null,
  ) {
    const { db, state } = fakeDb(order);
    const calls: string[] = [];
    const spied: SettlementDb = {
      from: db.from.bind(db),
      rpc(fn: string) {
        calls.push(fn);
        return Promise.resolve({ error: fail(fn) });
      },
    };
    return { db: spied, calls, state };
  }

  function paidPending(): OrderRow {
    return {
      id: "order-1",
      payment_status: "pending",
      total_cents: 5399,
      currency: "usd",
      email: "buyer@example.com",
    };
  }

  it("calls the function that moves stock, not the counter-only one", () => {
    // The whole point. If this ever flips back, quantity_available is
    // decorative again and nothing else in the suite would notice.
    const { db, calls } = rpcSpyDb(paidPending(), () => null);
    return settleCheckoutSession(db, email, session()).then((result) => {
      expect(result).toBe("paid");
      expect(calls).toEqual(["shop_apply_paid_inventory"]);
      expect(calls).not.toContain("shop_increment_units_sold");
    });
  });

  it("falls back to the old counter when the new function is not applied yet", async () => {
    // Merged is not applied. Calling only the new function during that window
    // would stop units_sold working too, trading one silent bug for two.
    const { db, calls } = rpcSpyDb(paidPending(), (fn) =>
      fn === "shop_apply_paid_inventory"
        ? { message: "Could not find the function", code: "PGRST202" }
        : null,
    );
    const result = await settleCheckoutSession(db, email, session());
    expect(result).toBe("paid");
    expect(calls).toEqual([
      "shop_apply_paid_inventory",
      "shop_increment_units_sold",
    ]);
  });

  it("recognises the raw Postgres undefined_function code too", async () => {
    const { db, calls } = rpcSpyDb(paidPending(), (fn) =>
      fn === "shop_apply_paid_inventory"
        ? { message: "no function matches", code: "42883" }
        : null,
    );
    await settleCheckoutSession(db, email, session());
    expect(calls).toContain("shop_increment_units_sold");
  });

  it("does NOT fall back on an ordinary failure", async () => {
    // A deadlock or a permissions error is not "the function is missing".
    // Retrying the superseded function would double-count units_sold if the
    // new one had in fact run.
    const { db, calls } = rpcSpyDb(paidPending(), (fn) =>
      fn === "shop_apply_paid_inventory"
        ? { message: "deadlock detected", code: "40P01" }
        : null,
    );
    const result = await settleCheckoutSession(db, email, session());
    expect(result).toBe("paid");
    expect(calls).toEqual(["shop_apply_paid_inventory"]);
  });

  it("never fails the webhook when inventory cannot be applied", async () => {
    // Stripe retries a 500, and the money has already moved.
    const { db } = rpcSpyDb(paidPending(), () => ({
      message: "everything is on fire",
      code: "XX000",
    }));
    await expect(settleCheckoutSession(db, email, session())).resolves.toBe(
      "paid",
    );
  });
});
