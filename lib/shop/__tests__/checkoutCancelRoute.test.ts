// Cancelling an abandoned checkout (audit F-09, and F-01's race): the Stripe
// session is expired before the order is cancelled, a session that already
// completed is never cancelled under the buyer, and only a pending order moves.

import { beforeEach, describe, expect, it, vi } from "vitest";

const ORDER = "33333333-3333-4333-8333-333333333333";

const state = vi.hoisted(() => ({
  enabled: true,
  order: null as null | { id: string; payment_status: string; stripe_session_id: string | null },
  session: { status: "open" } as { status: string },
  stripeFails: false,
  updateError: null as null | { message: string },
  log: [] as string[],
  update: null as null | { values: Record<string, unknown>; where: [string, unknown][] },
}));

vi.mock("@/lib/shop/flags", () => ({ shopEnabled: () => state.enabled }));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => false, ipKey: () => "test" }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.order }) }) }),
      update: (values: Record<string, unknown>) => {
        const where: [string, unknown][] = [];
        const chain = {
          eq(col: string, val: unknown) {
            where.push([col, val]);
            if (where.length === 2) {
              state.log.push("cancel order");
              state.update = { values, where };
              return Promise.resolve({ error: state.updateError });
            }
            return chain;
          },
        };
        return chain;
      },
    }),
  }),
}));
vi.mock("stripe", () => ({
  default: class {
    checkout = {
      sessions: {
        retrieve: async () => {
          state.log.push("ask Stripe");
          if (state.stripeFails) throw new Error("network");
          return state.session;
        },
        expire: async () => {
          state.log.push("expire session");
        },
      },
    };
  },
}));

const { POST } = await import("@/app/api/shop/checkout/cancel/route");
const cancel = (body: unknown) =>
  POST(new Request("https://purifyapp.net/api/shop/checkout/cancel", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  state.enabled = true;
  state.order = { id: ORDER, payment_status: "pending", stripe_session_id: "cs_test_1" };
  state.session = { status: "open" };
  state.stripeFails = false;
  state.updateError = null;
  state.log.length = 0;
  state.update = null;
});

describe("cancelling a checkout", () => {
  it("expires the Stripe session before it cancels the order, and cancels only a pending one", async () => {
    const res = await cancel({ orderId: ORDER });
    expect(await res.json()).toEqual({ ok: true, status: "cancelled" });
    expect(state.log).toEqual(["ask Stripe", "expire session", "cancel order"]);
    expect(state.update?.values).toMatchObject({ payment_status: "cancelled", fulfillment_status: "cancelled" });
    expect(state.update?.where).toEqual([
      ["id", ORDER],
      ["payment_status", "pending"],
    ]);
  });

  it("never cancels a checkout Stripe says completed: the webhook settles it as paid", async () => {
    state.session = { status: "complete" };
    const res = await cancel({ orderId: ORDER });
    expect(res.status).toBe(409);
    expect(state.log).toEqual(["ask Stripe"]);
    expect(state.update).toBeNull();
  });

  it("leaves a paid, refunded or cancelled order as it is, and says so", async () => {
    for (const status of ["paid", "refunded", "cancelled"]) {
      state.order = { id: ORDER, payment_status: status, stripe_session_id: "cs_test_1" };
      const res = await cancel({ orderId: ORDER });
      expect(await res.json()).toEqual({ ok: true, status });
    }
    expect(state.log).toEqual([]);
  });

  it("still cancels a pending order when Stripe cannot be asked, the pending-only write keeping a late payment safe", async () => {
    state.stripeFails = true;
    const res = await cancel({ orderId: ORDER });
    expect(res.status).toBe(200);
    expect(state.update?.where).toContainEqual(["payment_status", "pending"]);
  });

  it("answers 400 to a body without an order's id, 404 to an order that is not there, 500 when the write fails", async () => {
    expect((await cancel({ orderId: "not-a-uuid" })).status).toBe(400);
    state.order = null;
    expect((await cancel({ orderId: ORDER })).status).toBe(404);
    state.order = { id: ORDER, payment_status: "pending", stripe_session_id: null };
    state.updateError = { message: "down" };
    expect((await cancel({ orderId: ORDER })).status).toBe(500);
  });

  it("answers 404 while the shop is closed", async () => {
    state.enabled = false;
    expect((await cancel({ orderId: ORDER })).status).toBe(404);
  });
});
