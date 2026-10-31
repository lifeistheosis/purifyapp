import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The console's two actions on an order (r3-16, 2026-10-30): a refund and a
 * reship, run for real with the session, the database and the money path
 * stood in for.
 *
 * What would go wrong if this broke: anyone but an admin starting a refund or
 * a reship; a refund that runs without being confirmed, runs twice, or is not
 * recorded as the admin's who made it; or a reship that overwrites an order a
 * refund landed on a moment before.
 */

type Op = { table: string; kind: "select" | "insert" | "update"; filters: [string, unknown][]; values?: unknown };
type Result = { data: unknown; error: { message: string; code?: string } | null };

const state = vi.hoisted(() => ({
  user: null as null | { id: string; email?: string | null },
  ops: [] as Op[],
  adminClients: 0,
  handle: (() => ({ data: null, error: null })) as (op: Op) => Result,
  approve: vi.fn(),
  refundedEmail: vi.fn(),
  logged: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
  createClientFromRequest: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    state.adminClients += 1;
    return {
      auth: { admin: { getUserById: async () => ({ data: { user: null }, error: null }) } },
      from(table: string) {
        const op: Op = { table, kind: "select", filters: [] };
        const run = () => {
          state.ops.push(op);
          return Promise.resolve(state.handle(op));
        };
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        Object.assign(chain, {
          select: self,
          order: self,
          limit: self,
          range: self,
          insert(values: unknown) {
            op.kind = "insert";
            op.values = values;
            return chain;
          },
          update(values: unknown) {
            op.kind = "update";
            op.values = values;
            return chain;
          },
          eq(col: string, val: unknown) {
            op.filters.push([col, val]);
            return chain;
          },
          in(col: string, val: unknown) {
            op.filters.push([col, val]);
            return chain;
          },
          ilike(col: string, val: unknown) {
            op.filters.push([col, val]);
            return chain;
          },
          maybeSingle: run,
          single: run,
          then: (ok: (v: Result) => unknown, bad: (e: unknown) => unknown) => run().then(ok, bad),
        });
        return chain;
      },
    };
  },
}));

vi.mock("@/lib/shop/refundExecution", () => ({ approveRefundRequest: state.approve }));
vi.mock("@/lib/shop/orderEmails", () => ({ sendOrderRefundedEmail: state.refundedEmail }));
vi.mock("@/lib/admin/activityLog", () => ({
  logActivity: async (e: Record<string, unknown>) => {
    state.logged.push(e);
  },
}));
import { POST as refundPOST } from "@/app/api/admin/shop/refunds/console/route";
import { POST as reshipPOST } from "@/app/api/admin/shop/orders/reship/route";

const ORDER = "0c9f4e21-1111-4222-8333-444455556666";
const TICKET = "3f0a61d2-1111-4222-8333-444455556666";

const post = (handler: (r: Request) => Promise<Response>, body: unknown) =>
  handler(
    new Request("https://purifyapp.net/api/admin/x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

const ADMIN_EMAILS = process.env.ADMIN_EMAILS;
afterAll(() => {
  if (ADMIN_EMAILS === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = ADMIN_EMAILS;
});

beforeEach(() => {
  process.env.ADMIN_EMAILS = "owner@purify.example";
  state.user = { id: "admin-1", email: "owner@purify.example" };
  state.ops = [];
  state.adminClients = 0;
  state.logged = [];
  state.handle = () => ({ data: null, error: null });
  state.approve.mockReset();
  state.refundedEmail.mockReset();
  state.refundedEmail.mockResolvedValue({ ok: true });
});

describe("the admin gate", () => {
  const calls: [string, () => Promise<Response>][] = [
    ["a console refund", () => post(refundPOST, { orderId: ORDER, confirm: true })],
    ["a reship", () => post(reshipPOST, { orderId: ORDER, reason: "bent", confirm: true })],
  ];

  for (const [name, call] of calls) {
    it(`answers 403 to a reader who is not signed in: ${name}`, async () => {
      state.user = null;
      expect((await call()).status).toBe(403);
      expect(state.adminClients).toBe(0);
    });

    it(`answers 403 to a signed-in reader who is not an admin: ${name}`, async () => {
      state.user = { id: "u-1", email: "reader@example.com" };
      expect((await call()).status).toBe(403);
      expect(state.adminClients).toBe(0);
    });
  }
});

describe("a refund from the console", () => {
  const paidOrder = {
    id: ORDER,
    email: "g.sample@example.com",
    total_cents: 3600,
    currency: "usd",
    payment_status: "paid",
    stripe_payment_intent: "pi_sample",
  };

  function shop(over: { order?: unknown; open?: unknown[] } = {}) {
    state.handle = (op) => {
      if (op.table === "shop_orders") return { data: over.order ?? paidOrder, error: null };
      if (op.table === "shop_refund_requests" && op.kind === "select") return { data: over.open ?? [], error: null };
      if (op.table === "shop_refund_requests" && op.kind === "insert") return { data: { id: "req-1" }, error: null };
      return { data: null, error: null };
    };
  }

  it("is refused unless it says it was confirmed, before anything is read", async () => {
    shop();
    const res = await post(refundPOST, { orderId: ORDER });
    expect(res.status).toBe(400);
    expect(state.ops).toEqual([]);
    expect(state.approve).not.toHaveBeenCalled();
  });

  it("files a request, sends it through claim, spend and settle, records who, and tells the buyer", async () => {
    shop();
    state.approve.mockResolvedValue("processed");
    const res = await post(refundPOST, { orderId: ORDER, amountCents: 1200, ticketId: TICKET, confirm: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, status: "processed", amountCents: 1200 });

    const filed = state.ops.find((o) => o.table === "shop_refund_requests" && o.kind === "insert");
    expect(filed?.values).toMatchObject({ order_id: ORDER, reason: "other", amount_cents: 1200 });
    expect(state.approve).toHaveBeenCalledTimes(1);
    expect(state.approve.mock.calls[0][0]).toBe("req-1");
    expect(state.approve.mock.calls[0][1]).toEqual({ id: ORDER, total_cents: 3600, stripe_payment_intent: "pi_sample" });
    expect(state.logged).toEqual([
      expect.objectContaining({
        actorEmail: "owner@purify.example",
        action: "refund.console",
        entityId: "req-1",
        detail: expect.objectContaining({ orderId: ORDER, amountCents: 1200, outcome: "processed", ticketId: TICKET }),
      }),
    ]);
    expect(state.refundedEmail).toHaveBeenCalledWith(expect.objectContaining({ id: ORDER, amountCents: 1200, viaCard: true }));
  });

  it("refuses while another refund is open on the order, so it is never paid twice", async () => {
    shop({ open: [{ status: "approved" }] });
    const res = await post(refundPOST, { orderId: ORDER, confirm: true });
    expect(res.status).toBe(409);
    expect(state.ops.some((o) => o.kind === "insert")).toBe(false);
    expect(state.approve).not.toHaveBeenCalled();
  });

  it("refuses more than was paid, and an order that was never paid", async () => {
    shop();
    expect((await post(refundPOST, { orderId: ORDER, amountCents: 3601, confirm: true })).status).toBe(400);
    shop({ order: { ...paidOrder, payment_status: "pending" } });
    expect((await post(refundPOST, { orderId: ORDER, confirm: true })).status).toBe(409);
    expect(state.approve).not.toHaveBeenCalled();
  });

  it("says so when Stripe did not take it, and sends no refund email", async () => {
    shop();
    state.approve.mockResolvedValue("approved");
    const res = await post(refundPOST, { orderId: ORDER, confirm: true });
    expect(res.status).toBe(502);
    expect(state.refundedEmail).not.toHaveBeenCalled();
    expect(state.logged[0]).toMatchObject({ action: "refund.console", detail: expect.objectContaining({ outcome: "approved" }) });
  });
});

describe("a reship", () => {
  function shop(status: { payment_status: string; fulfillment_status: string }, updated = true) {
    state.handle = (op) => {
      if (op.table === "shop_orders" && op.kind === "select") {
        return { data: { ...status, outbound_tracking: "9400100000000000000000" }, error: null };
      }
      if (op.table === "shop_orders" && op.kind === "update") {
        return {
          data: updated ? [{ id: ORDER, payment_status: "paid", fulfillment_status: "supplier_order_needed" }] : [],
          error: null,
        };
      }
      return { data: null, error: null };
    };
  }

  it("starts the order again at Needs sourcing, guarded on both statuses, and keeps the first tracking", async () => {
    shop({ payment_status: "paid", fulfillment_status: "delivered" });
    const res = await post(reshipPOST, { orderId: ORDER, reason: "the cross arrived bent", confirm: true });
    expect(res.status).toBe(200);
    const update = state.ops.find((o) => o.table === "shop_orders" && o.kind === "update");
    expect(update?.values).toMatchObject({ fulfillment_status: "supplier_order_needed", outbound_tracking: null, inbound_tracking: null });
    expect(update?.filters).toEqual([
      ["id", ORDER],
      ["payment_status", "paid"],
      ["fulfillment_status", "delivered"],
    ]);
    const event = state.ops.find((o) => o.table === "shop_order_events");
    expect((event?.values as { note: string }).note).toBe(
      "Reship at no charge: the cross arrived bent. First parcel: 9400100000000000000000.",
    );
    expect(state.logged[0]).toMatchObject({ action: "order.reship", actorEmail: "owner@purify.example", entityId: ORDER });
  });

  it("refuses an order whose money went back, and one that has not left us", async () => {
    shop({ payment_status: "refunded", fulfillment_status: "refunded" });
    expect((await post(reshipPOST, { orderId: ORDER, reason: "x", confirm: true })).status).toBe(409);
    shop({ payment_status: "paid", fulfillment_status: "packaged" });
    expect((await post(reshipPOST, { orderId: ORDER, reason: "x", confirm: true })).status).toBe(409);
    expect(state.ops.some((o) => o.kind === "update")).toBe(false);
  });

  it("does not overwrite an order that moved while the console was open", async () => {
    shop({ payment_status: "paid", fulfillment_status: "shipped" }, false);
    const res = await post(reshipPOST, { orderId: ORDER, reason: "lost", confirm: true });
    expect(res.status).toBe(409);
    expect(state.ops.some((o) => o.table === "shop_order_events")).toBe(false);
    expect(state.logged).toEqual([]);
  });

  it("wants a reason and a confirmation", async () => {
    shop({ payment_status: "paid", fulfillment_status: "shipped" });
    expect((await post(reshipPOST, { orderId: ORDER, reason: "  ", confirm: true })).status).toBe(400);
    expect((await post(reshipPOST, { orderId: ORDER, reason: "lost" })).status).toBe(400);
  });
});
