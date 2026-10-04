import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The three places that settle an order, each run for real against a Stripe
 * that answers from memory, and held to the row it leaves behind.
 *
 * WHY THESE EXIST BESIDE webhookSettlement.test.ts. That suite proves the
 * settlement writes the instant it is handed. It cannot prove a caller hands
 * it the right one, and every wrong one typechecks: a Checkout Session has a
 * `created` of its own (when checkout opened), and `now` is a number too.
 * F-33 was exactly this shape, a write that existed on paper and was never
 * wired in: 20260822000300_shop_orders_paid_at.sql added shop_orders.paid_at
 * for the settlement to fill, and six weeks later all four paid orders in
 * production had none.
 *
 * Three callers, three sources, one rule. The webhook has Stripe's event and
 * uses its time. Reconcile and the abandoned sweep have only a session they
 * read back, so they ask Stripe for the charge and use the charge's time.
 * None may use the session's `created` or this server's clock.
 */

type Row = Record<string, unknown>;

const stripe = vi.hoisted(() => ({
  /** What signature verification hands the webhook route. */
  event: null as unknown,
  retrieveSession: vi.fn(),
  retrieveIntent: vi.fn(),
}));
const world = vi.hoisted(() => ({ admin: null as unknown }));

vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent: () => stripe.event };
    checkout = { sessions: { retrieve: stripe.retrieveSession, expire: vi.fn(async () => ({})) } };
    paymentIntents = { retrieve: stripe.retrieveIntent };
  },
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => world.admin }));
vi.mock("@/lib/admin/access", () => ({ getAdminUser: async () => ({ email: "owner@example.com" }) }));
// What a settlement sets off besides the row: mail, alerts, the delivery log.
vi.mock("@/lib/shop/orderEmails", () => ({ sendOrderConfirmationEmail: vi.fn(async () => ({})) }));
vi.mock("@/lib/admin/activityLog", () => ({ logActivity: vi.fn(async () => {}) }));
vi.mock("@/lib/admin/ownerAlert", () => ({ notifyOwner: vi.fn(async () => {}), saleAlert: () => ({}) }));
vi.mock("@/lib/shop/lowStockServer", () => ({ alertLowStockAfterSale: vi.fn(async () => {}) }));
vi.mock("@/lib/shop/payouts", () => ({ applyAccountCapabilities: vi.fn() }));
vi.mock("@/lib/ambassadors/stripeAccount", () => ({ syncAmbassadorAccount: vi.fn() }));
vi.mock("@/lib/community/notify", () => ({ insertNotifications: vi.fn(async () => {}) }));

import { GET as reconcileDryRun, POST as reconcileApply } from "@/app/api/admin/shop/reconcile/route";
import { POST as webhook } from "@/app/api/shop/stripe-webhook/route";
import { sweepAbandonedCheckouts } from "@/lib/shop/abandonedSweep";

const ORDER = "0b5c7e1a-3d42-4f6b-9a18-7c2e5d9f4b10";

// The same instants as webhookSettlement.test.ts, in Stripe's whole seconds,
// with the strings written out by hand.
const OPENED = 1789689000; // 2026-09-17T23:50:00Z, checkout opened
const OPENED_ISO = "2026-09-17T23:50:00.000Z";
const PAID = 1789689850; // 2026-09-18T00:04:10Z, the charge
const PAID_ISO = "2026-09-18T00:04:10.000Z";
const REPORTED = 1789689852; // 2026-09-18T00:04:12Z, Stripe's event, two seconds on
const REPORTED_ISO = "2026-09-18T00:04:12.000Z";
/** When the sweep or the owner got to it: two days after the money moved. */
const SWEPT = Date.parse("2026-09-20T03:00:00Z");

/**
 * The supabase-js calls these three callers and the settlement make, over
 * rows held in memory. A body goes through JSON as PostgREST's does, so a key
 * set to undefined is a column left alone.
 */
function fakeAdmin(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const rows = (tables[table] ??= []);
      const tests: ((row: Row) => boolean)[] = [];
      let values: Row | null = null;
      let cap = Infinity;
      const run = () => {
        const hit = rows.filter((row) => tests.every((test) => test(row)));
        if (values) for (const row of hit) Object.assign(row, JSON.parse(JSON.stringify(values)));
        return hit.slice(0, cap).map((row) => ({ ...row }));
      };
      const query = {
        select: () => query,
        update: (v: Row) => ((values = v), query),
        eq: (column: string, value: unknown) => (tests.push((row) => row[column] === value), query),
        lt: (column: string, value: string) => (tests.push((row) => String(row[column]) < value), query),
        // Only ever `.not(column, "is", null)` here.
        not: (column: string) => (tests.push((row) => row[column] != null), query),
        order: () => query,
        limit: (n: number) => ((cap = n), query),
        maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
        then: <T>(resolve: (result: { data: Row[]; error: null }) => T) =>
          Promise.resolve({ data: run(), error: null }).then(resolve),
      };
      return query;
    },
    rpc: async () => ({ error: null }),
  };
}

/** A checkout that was opened and never settled here. */
function pendingOrder(): Row {
  return {
    id: ORDER,
    payment_status: "pending",
    fulfillment_status: "pending",
    total_cents: 5399,
    currency: "usd",
    email: null,
    stripe_session_id: "cs_1",
    stripe_payment_intent: null,
    paid_at: null,
    created_at: OPENED_ISO,
    updated_at: OPENED_ISO,
  };
}

/** The session Stripe holds for it once the buyer has paid. */
function paidSession(): Row {
  return {
    id: "cs_1",
    status: "complete",
    payment_status: "paid",
    client_reference_id: ORDER,
    amount_total: 5399,
    currency: "usd",
    payment_intent: "pi_1",
    // The trap: a number, in seconds, on the very object every caller holds.
    created: OPENED,
    customer_details: { email: "buyer@example.com" },
    metadata: { order_id: ORDER },
  };
}

let tables: Record<string, Row[]>;
const order = () => tables.shop_orders[0];

beforeEach(() => {
  tables = {
    shop_orders: [pendingOrder()],
    shop_order_items: [{ order_id: ORDER, title: "Icon", quantity: 1, unit_price_cents: 4900 }],
    admin_activity_log: [],
  };
  world.admin = fakeAdmin(tables);
  stripe.event = null;
  stripe.retrieveSession.mockReset().mockResolvedValue(paidSession());
  stripe.retrieveIntent.mockReset().mockResolvedValue({ id: "pi_1", latest_charge: { id: "ch_1", created: PAID } });
  vi.stubEnv("STRIPE_SECRET_KEY", "test-key");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "test-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("the webhook", () => {
  const deliver = () =>
    webhook(
      new Request("https://purifyapp.net/api/shop/stripe-webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=test" },
        body: "{}",
      }),
    );

  it("stamps the order with the event's time, not the session's", async () => {
    stripe.event = {
      id: "evt_1",
      type: "checkout.session.completed",
      created: REPORTED,
      data: { object: paidSession() },
    };

    const res = await deliver();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true, result: "paid" });
    expect(order().payment_status).toBe("paid");
    expect(order().stripe_payment_intent).toBe("pi_1");
    expect(order().paid_at).toBe(REPORTED_ISO);
    // It was handed an event, so it has no reason to ask Stripe anything.
    expect(stripe.retrieveIntent).not.toHaveBeenCalled();
  });

  it("leaves the instant alone when Stripe delivers the same payment again", async () => {
    stripe.event = { id: "evt_1", type: "checkout.session.completed", created: REPORTED, data: { object: paidSession() } };
    await deliver();
    // A resend from the dashboard is a new delivery with a later time.
    stripe.event = { id: "evt_2", type: "checkout.session.completed", created: REPORTED + 86_400, data: { object: paidSession() } };

    const res = await deliver();

    expect(await res.json()).toEqual({ received: true, result: "retry-noop" });
    expect(order().paid_at).toBe(REPORTED_ISO);
  });
});

describe("the abandoned sweep", () => {
  const sweep = () => sweepAbandonedCheckouts(world.admin as SupabaseClient, SWEPT);

  it("stamps a payment the webhook missed with the charge's time, not the time of the sweep", async () => {
    const report = await sweep();

    expect(report).toMatchObject({ checked: 1, settled: 1, cancelled: 0, left: 0 });
    expect(order().payment_status).toBe("paid");
    expect(order().paid_at).toBe(PAID_ISO);
    expect(stripe.retrieveIntent).toHaveBeenCalledWith("pi_1", { expand: ["latest_charge"] });
    // The session is read exactly as it was before: nothing expanded on it,
    // so a key that cannot see charges still reads sessions.
    expect(stripe.retrieveSession).toHaveBeenCalledWith("cs_1");
  });

  it("still settles when Stripe will not show the charge, and leaves paid_at unwritten", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const loud = vi.spyOn(console, "error").mockImplementation(() => {});
    stripe.retrieveIntent.mockRejectedValue(new Error("This API key does not have the required permissions"));

    const report = await sweep();

    expect(report).toMatchObject({ settled: 1, left: 0 });
    expect(order().payment_status).toBe("paid");
    expect(order().stripe_payment_intent).toBe("pi_1");
    expect(order().paid_at).toBeNull();
    expect(loud).toHaveBeenCalledWith(expect.stringContaining("SETTLED WITHOUT A PAYMENT TIME"));
  });

  it("asks for no charge when there is nothing to settle", async () => {
    stripe.retrieveSession.mockResolvedValue({ ...paidSession(), status: "expired", payment_status: "unpaid" });

    const report = await sweep();

    expect(report).toMatchObject({ settled: 0, cancelled: 1 });
    expect(order().payment_status).toBe("cancelled");
    expect(order().paid_at).toBeNull();
    expect(stripe.retrieveIntent).not.toHaveBeenCalled();
  });
});

describe("reconcile", () => {
  const apply = () =>
    reconcileApply(
      new NextRequest("https://purifyapp.net/api/admin/shop/reconcile", {
        method: "POST",
        body: JSON.stringify({ confirm: true }),
      }),
    );

  it("stamps what it settles with the charge's time, not the time of the press", async () => {
    const res = await apply();
    const body = await res.json();

    expect(body.findings).toEqual([
      { orderId: ORDER, totalCents: 5399, stripeStatus: "paid", result: "paid" },
    ]);
    expect(order().payment_status).toBe("paid");
    expect(order().paid_at).toBe(PAID_ISO);
    expect(stripe.retrieveIntent).toHaveBeenCalledWith("pi_1", { expand: ["latest_charge"] });
    expect(stripe.retrieveSession).toHaveBeenCalledWith("cs_1");
  });

  it("writes nothing and asks for no charge on a dry run", async () => {
    const res = await reconcileDryRun();
    const body = await res.json();

    expect(body.findings[0]).toMatchObject({ orderId: ORDER, note: "would be settled" });
    expect(order().payment_status).toBe("pending");
    expect(order().paid_at).toBeNull();
    expect(stripe.retrieveIntent).not.toHaveBeenCalled();
  });
});
