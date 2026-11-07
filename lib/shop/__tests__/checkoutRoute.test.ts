// The checkout route (audit F-09, "no test coverage on API routes / money
// paths"): what the request may carry, what reaches the pricing, and what each
// outcome answers. The pricing itself (lib/shop/checkout.ts, priceCart) has
// its own tests; this holds the door in front of it.

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  enabled: true,
  limited: false,
  user: null as null | { id: string; email: string },
  result: { ok: true, url: "https://checkout.stripe.com/c/pay/cs_test", orderId: "order-1" } as Record<string, unknown>,
  calls: [] as unknown[][],
  referrals: [] as unknown[][],
}));

vi.mock("@/lib/shop/flags", () => ({ shopEnabled: () => state.enabled }));
vi.mock("@/lib/security/ratelimit", () => ({ rateLimited: async () => state.limited, ipKey: () => "test" }));
vi.mock("@/lib/supabase/server", () => ({
  createClientFromRequest: async () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }),
}));
vi.mock("@/lib/shop/checkout", () => ({
  createCheckout: async (...args: unknown[]) => {
    state.calls.push(args);
    return state.result;
  },
}));
vi.mock("@/lib/ambassadors/attach", () => ({
  attachReferral: async (...args: unknown[]) => {
    state.referrals.push(args);
  },
}));

const { POST } = await import("@/app/api/shop/checkout/route");

const post = (body: unknown, raw?: string) =>
  POST(
    new Request("https://purifyapp.net/api/shop/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "purify_ref=abc" },
      body: raw ?? JSON.stringify(body),
    }),
  );

beforeEach(() => {
  state.enabled = true;
  state.limited = false;
  state.user = null;
  state.result = { ok: true, url: "https://checkout.stripe.com/c/pay/cs_test", orderId: "order-1" };
  state.calls.length = 0;
  state.referrals.length = 0;
});

describe("the checkout route", () => {
  it("answers 404 while the shop is closed, and 429 to a buyer asking too often", async () => {
    state.enabled = false;
    expect((await post({ productSlug: "icon", quantity: 1, termsAccepted: true })).status).toBe(404);
    state.enabled = true;
    state.limited = true;
    expect((await post({ productSlug: "icon", quantity: 1, termsAccepted: true })).status).toBe(429);
    expect(state.calls).toHaveLength(0);
  });

  it("refuses a body that is not JSON, or one without the terms accepted", async () => {
    expect((await post(null, "{not json")).status).toBe(400);
    expect((await post({ productSlug: "icon", quantity: 1 })).status).toBe(400);
    expect((await post({ productSlug: "icon", quantity: 1, termsAccepted: false })).status).toBe(400);
    expect((await post({ productSlug: "Not A Slug", quantity: 1, termsAccepted: true })).status).toBe(400);
    expect(state.calls).toHaveLength(0);
  });

  it("hands the pricing slugs and quantities only: a price the client sends never reaches it", async () => {
    state.user = { id: "11111111-1111-4111-8111-111111111111", email: "reader@example.com" };
    const res = await post({ productSlug: "icon", quantity: 2, termsAccepted: true, price: 1, total: 1, unitPrice: 1 });
    expect(res.status).toBe(200);
    const [items, buyer, origin] = state.calls[0] as [unknown, unknown, string];
    expect(items).toEqual([{ productSlug: "icon", quantity: 2 }]);
    expect(JSON.stringify(state.calls[0])).not.toMatch(/price|total|unitPrice/);
    expect(buyer).toEqual({ id: "11111111-1111-4111-8111-111111111111", email: "reader@example.com" });
    expect(origin).toMatch(/^https:\/\//);
  });

  it("takes a cart of items the same way, and a guest checks out with no account", async () => {
    const res = await post({ items: [{ productSlug: "icon", quantity: 1 }, { productSlug: "candle", quantity: 3 }], termsAccepted: true });
    expect(res.status).toBe(200);
    expect(state.calls[0][0]).toEqual([
      { productSlug: "icon", quantity: 1 },
      { productSlug: "candle", quantity: 3 },
    ]);
    expect(state.calls[0][1]).toEqual({ id: null, email: null });
  });

  it("answers Stripe's page and the order, and only then writes the referral, never failing the checkout on it", async () => {
    const res = await post({ productSlug: "icon", quantity: 1, termsAccepted: true });
    expect(await res.json()).toEqual({ url: "https://checkout.stripe.com/c/pay/cs_test", orderId: "order-1" });
    expect(state.referrals).toEqual([["order-1", "purify_ref=abc", null]]);
  });

  it("answers 503 while checkout is dark, and 409 with the reason when it cannot be priced", async () => {
    state.result = { ok: false, disabled: true };
    expect((await post({ productSlug: "icon", quantity: 1, termsAccepted: true })).status).toBe(503);
    state.result = { ok: false, reason: "That piece is sold out." };
    const res = await post({ productSlug: "icon", quantity: 1, termsAccepted: true });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "That piece is sold out." });
    expect(state.referrals).toHaveLength(0);
  });
});
