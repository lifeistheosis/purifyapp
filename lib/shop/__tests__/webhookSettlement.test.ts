import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  amountsMatch,
  chargeTimeOf,
  paidAtOf,
  settleCheckoutSession,
  type ChargeReader,
  type SessionLike,
  type SettlementDb,
} from "@/lib/shop/webhookSettlement";

// Audit F-01 (payment wins over cancellation), F-03 (amount verification) and
// F-33 (the payment instant): the settlement rules for real money, tested
// against an injected fake DB.

type OrderRow = {
  id: string;
  payment_status: string;
  total_cents: number;
  currency: string;
  email: string | null;
  fulfillment_status?: string;
  paid_at?: string | null;
  stripe_payment_intent?: string | null;
};

// The example app/api/admin/revenue/daily/route.ts gives for why the column
// exists: checkout opened at 23:50 UTC on the 17th, paid on the 18th. In
// Stripe's unit, whole seconds, with the string each must become written out
// by hand so the test does not just repeat the conversion it is checking.
const OPENED = 1789689000; // 2026-09-17T23:50:00Z, the SESSION's created
const PAID = 1789689850; // 2026-09-18T00:04:10Z, the EVENT's created
const PAID_ISO = "2026-09-18T00:04:10.000Z";
const LATER = 1789810200; // 2026-09-19T09:30:00Z

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
  const state = {
    order,
    rpcCalls: 0,
    itemsQueried: 0,
    /** What each guarded update that matched a row was asked to write. */
    updates: [] as Record<string, unknown>[],
  };
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
                            state.updates.push(values);
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
    const result = await settleCheckoutSession(db, email, session(), PAID);
    expect(result).toBe("paid");
    expect(state.order?.payment_status).toBe("paid");
    expect(state.rpcCalls).toBe(1);
    expect(email).toHaveBeenCalledTimes(1);
  });

  it("(b) is a no-op on webhook retry (already paid): no effects", async () => {
    const { db, state } = fakeDb({ ...pendingOrder(), payment_status: "paid" });
    const result = await settleCheckoutSession(db, email, session(), PAID);
    expect(result).toBe("retry-noop");
    expect(state.rpcCalls).toBe(0);
    expect(email).not.toHaveBeenCalled();
  });

  it("(c) recovers a cancelled order when payment completed: payment wins (F-01)", async () => {
    const { db, state } = fakeDb({
      ...pendingOrder(),
      payment_status: "cancelled",
    });
    const result = await settleCheckoutSession(db, email, session(), PAID);
    expect(result).toBe("recovered");
    expect(state.order?.payment_status).toBe("paid");
    expect(state.rpcCalls).toBe(1);
    expect(email).toHaveBeenCalledTimes(1);
  });

  it("(h) enters the stage checkout named on the session, only when paid", async () => {
    const { db, state } = fakeDb({ ...pendingOrder(), fulfillment_status: "pending" });
    const result = await settleCheckoutSession(
      db,
      email,
      session({ metadata: { order_id: "order-1", fulfillment_on_paid: "supplier_order_needed" } }),
      PAID,
    );
    expect(result).toBe("paid");
    expect(state.order?.fulfillment_status).toBe("supplier_order_needed");
  });

  it("(i) ignores a stage it does not recognise, and leaves an old session's order alone", async () => {
    const odd = fakeDb({ ...pendingOrder(), fulfillment_status: "pending" });
    await settleCheckoutSession(odd.db, email, session({ metadata: { fulfillment_on_paid: "shipped" } }), PAID);
    expect(odd.state.order?.fulfillment_status).toBe("pending");

    const old = fakeDb({ ...pendingOrder(), fulfillment_status: "supplier_order_needed" });
    await settleCheckoutSession(old.db, email, session(), PAID);
    expect(old.state.order?.fulfillment_status).toBe("supplier_order_needed");
  });

  it("(d) refuses to mark paid on amount mismatch (F-03): no update, no effects", async () => {
    const { db, state } = fakeDb(pendingOrder());
    const result = await settleCheckoutSession(
      db,
      email,
      session({ amount_total: 100 }),
      PAID,
    );
    expect(result).toBe("amount-mismatch");
    expect(state.order?.payment_status).toBe("pending");
    expect(state.rpcCalls).toBe(0);
    expect(email).not.toHaveBeenCalled();
  });

  it("(e) unknown order id settles as order-missing", async () => {
    const { db } = fakeDb(null);
    expect(await settleCheckoutSession(db, email, session(), PAID)).toBe(
      "order-missing",
    );
  });

  it("(f) refunded orders are never re-marked", async () => {
    const { db, state } = fakeDb({
      ...pendingOrder(),
      payment_status: "refunded",
    });
    expect(await settleCheckoutSession(db, email, session(), PAID)).toBe(
      "ignored-status",
    );
    expect(state.order?.payment_status).toBe("refunded");
  });

  it("(g) sequential double delivery fires effects once total", async () => {
    const { db, state } = fakeDb(pendingOrder());
    expect(await settleCheckoutSession(db, email, session(), PAID)).toBe("paid");
    expect(await settleCheckoutSession(db, email, session(), PAID)).toBe(
      "retry-noop",
    );
    expect(state.rpcCalls).toBe(1);
    expect(email).toHaveBeenCalledTimes(1);
  });
});

/**
 * shop_orders.paid_at, the payment instant (F-33).
 *
 * 20260822000300_shop_orders_paid_at.sql added the column for the settlement
 * to fill, and the settlement change never shipped. On 2026-10-03 production
 * held four paid orders, each with a payment intent and a null paid_at, which
 * the column's own comment says cannot happen. These hold the write to the
 * settlement, and to Stripe's time rather than to any of the other times that
 * are lying around when an order settles.
 */
describe("the payment instant (F-33)", () => {
  const email = vi.fn(() => Promise.resolve());
  beforeEach(() => email.mockClear());
  afterEach(() => vi.restoreAllMocks());

  function unpaid(status: "pending" | "cancelled" = "pending"): OrderRow {
    return {
      id: "order-1",
      payment_status: status,
      total_cents: 5399,
      currency: "usd",
      email: null,
      paid_at: null,
      stripe_payment_intent: null,
    };
  }

  it("writes paid_at equal to the event time when a pending order is paid", async () => {
    const { db, state } = fakeDb(unpaid());
    expect(await settleCheckoutSession(db, email, session(), PAID)).toBe("paid");
    expect(state.order?.paid_at).toBe(PAID_ISO);
  });

  it("writes it in the one update that writes the payment intent", async () => {
    // "So the two can never diverge": the census in the migration counts paid
    // rows that carry one and not the other, and expects none.
    const { db, state } = fakeDb(unpaid());
    await settleCheckoutSession(db, email, session(), PAID);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0]).toMatchObject({
      payment_status: "paid",
      stripe_payment_intent: "pi_123",
      paid_at: PAID_ISO,
    });
  });

  it("is not the session's own created, which is when checkout opened", async () => {
    // The untruth the column exists to replace. A session carries a `created`
    // of its own, fourteen minutes before the payment here and on the day
    // before it, and nothing in the settlement may reach for it.
    const delivered = { ...session(), created: OPENED };
    const { db, state } = fakeDb(unpaid());
    await settleCheckoutSession(db, email, delivered, PAID);
    expect(state.order?.paid_at).toBe(PAID_ISO);
    expect(state.order?.paid_at).not.toBe("2026-09-17T23:50:00.000Z");
  });

  it("does not overwrite it on a retry of an order already paid", async () => {
    // Stripe redelivers, and a resend from its dashboard can come days later.
    const { db, state } = fakeDb({
      ...unpaid(),
      payment_status: "paid",
      paid_at: PAID_ISO,
      stripe_payment_intent: "pi_123",
    });
    expect(await settleCheckoutSession(db, email, session(), LATER)).toBe("retry-noop");
    expect(state.order?.paid_at).toBe(PAID_ISO);
    expect(state.updates).toHaveLength(0);
  });

  it("keeps the first instant when the same order is delivered twice", async () => {
    const { db, state } = fakeDb(unpaid());
    expect(await settleCheckoutSession(db, email, session(), PAID)).toBe("paid");
    expect(await settleCheckoutSession(db, email, session(), LATER)).toBe("retry-noop");
    expect(state.order?.paid_at).toBe(PAID_ISO);
    expect(state.updates).toHaveLength(1);
  });

  it("writes it on the cancelled-then-paid recovery too (F-01)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, state } = fakeDb(unpaid("cancelled"));
    expect(await settleCheckoutSession(db, email, session(), PAID)).toBe("recovered");
    expect(state.order?.payment_status).toBe("paid");
    expect(state.order?.paid_at).toBe(PAID_ISO);
    expect(state.order?.stripe_payment_intent).toBe("pi_123");
  });

  it("writes nothing when the amount does not match (F-03)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, state } = fakeDb(unpaid());
    expect(
      await settleCheckoutSession(db, email, session({ amount_total: 100 }), PAID),
    ).toBe("amount-mismatch");
    expect(state.order?.paid_at).toBeNull();
    expect(state.updates).toHaveLength(0);
  });

  it("still marks the order paid when Stripe gave no instant, and says so", async () => {
    // The migration: nothing may refuse a write that records money arriving,
    // and the column is never filled from a clock that was not there.
    const loud = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, state } = fakeDb(unpaid());
    expect(await settleCheckoutSession(db, email, session(), null)).toBe("paid");
    expect(state.order?.payment_status).toBe("paid");
    expect(state.order?.stripe_payment_intent).toBe("pi_123");
    expect("paid_at" in state.updates[0]).toBe(false);
    expect(state.order?.paid_at).toBeNull();
    expect(loud).toHaveBeenCalledWith(
      expect.stringContaining("SETTLED WITHOUT A PAYMENT TIME order=order-1"),
    );
  });

  it("leaves an instant already on the row alone when none came", async () => {
    // Paid, cancelled by hand, then the same payment delivered again with
    // nothing usable: the measured instant stays.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, state } = fakeDb({ ...unpaid("cancelled"), paid_at: PAID_ISO });
    expect(await settleCheckoutSession(db, email, session(), null)).toBe("recovered");
    expect(state.order?.paid_at).toBe(PAID_ISO);
  });

  it("does not raise the missing instant on a retry", async () => {
    const loud = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = fakeDb({ ...unpaid(), payment_status: "paid", paid_at: PAID_ISO });
    expect(await settleCheckoutSession(db, email, session(), null)).toBe("retry-noop");
    expect(loud).not.toHaveBeenCalled();
  });
});

describe("paidAtOf", () => {
  it("reads Stripe's whole seconds as an instant", () => {
    expect(paidAtOf(PAID)).toBe(PAID_ISO);
    expect(paidAtOf(OPENED)).toBe("2026-09-17T23:50:00.000Z");
  });

  it("gives nothing, rather than a guess, when there is no usable number", () => {
    for (const bad of [null, undefined, Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) {
      expect(paidAtOf(bad), String(bad)).toBeUndefined();
    }
    // What a JSON body could carry in place of a number.
    expect(paidAtOf("1789689850" as unknown as number)).toBeUndefined();
  });

  it("refuses milliseconds, which would date the sale some 56,000 years out", () => {
    expect(paidAtOf(PAID * 1000)).toBeUndefined();
    expect(paidAtOf(Date.now())).toBeUndefined();
  });
});

describe("chargeTimeOf", () => {
  afterEach(() => vi.restoreAllMocks());

  /** A Stripe that answers one way, and remembers what it was asked. */
  function stripeThat(
    answer: () => ReturnType<ChargeReader["paymentIntents"]["retrieve"]>,
  ) {
    const asked: [string, { expand: string[] }][] = [];
    const stripe: ChargeReader = {
      paymentIntents: {
        retrieve(id, params) {
          asked.push([id, params]);
          return answer();
        },
      },
    };
    return { stripe, asked };
  }

  it("asks Stripe for the payment intent's charge and gives the charge's time", async () => {
    const { stripe, asked } = stripeThat(async () => ({ latest_charge: { created: PAID } }));
    expect(await chargeTimeOf(stripe, session())).toBe(PAID);
    expect(asked).toEqual([["pi_123", { expand: ["latest_charge"] }]]);
  });

  it("reads the id off a payment intent that came back as an object", async () => {
    const { stripe, asked } = stripeThat(async () => ({ latest_charge: { created: PAID } }));
    expect(await chargeTimeOf(stripe, session({ payment_intent: { id: "pi_456" } }))).toBe(PAID);
    expect(asked[0][0]).toBe("pi_456");
  });

  it("is null, without asking, for a session with no payment intent", async () => {
    const { stripe, asked } = stripeThat(async () => ({ latest_charge: { created: PAID } }));
    expect(await chargeTimeOf(stripe, session({ payment_intent: null }))).toBeNull();
    expect(asked).toEqual([]);
  });

  it("is null when Stripe names the charge without its time, or has none", async () => {
    const named = stripeThat(async () => ({ latest_charge: "ch_1" }));
    const none = stripeThat(async () => ({ latest_charge: null }));
    const silent = stripeThat(async () => ({}));
    expect(await chargeTimeOf(named.stripe, session())).toBeNull();
    expect(await chargeTimeOf(none.stripe, session())).toBeNull();
    expect(await chargeTimeOf(silent.stripe, session())).toBeNull();
  });

  it("is null, never a throw, when Stripe refuses: the settlement goes ahead", async () => {
    // A key that may read sessions and not charges, a timeout, an outage.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { stripe } = stripeThat(async () => {
      throw new Error("This API key does not have the required permissions");
    });
    await expect(chargeTimeOf(stripe, session())).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();
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
    return settleCheckoutSession(db, email, session(), PAID).then((result) => {
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
    const result = await settleCheckoutSession(db, email, session(), PAID);
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
    await settleCheckoutSession(db, email, session(), PAID);
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
    const result = await settleCheckoutSession(db, email, session(), PAID);
    expect(result).toBe("paid");
    expect(calls).toEqual(["shop_apply_paid_inventory"]);
  });

  it("never fails the webhook when inventory cannot be applied", async () => {
    // Stripe retries a 500, and the money has already moved.
    const { db } = rpcSpyDb(paidPending(), () => ({
      message: "everything is on fire",
      code: "XX000",
    }));
    await expect(settleCheckoutSession(db, email, session(), PAID)).resolves.toBe(
      "paid",
    );
  });
});
