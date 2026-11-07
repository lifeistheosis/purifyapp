// createCheckout, the checkout's own work (audit F-09): every price from the
// database, the order written before Stripe so the session carries our id, an
// order whose lines could not be written never reaching Stripe, and a
// connected seller's charge sent to them with Purify's fee kept.

import { beforeEach, describe, expect, it, vi } from "vitest";

const EIKON = "eikon-store";

type Product = Record<string, unknown>;
const icon = (over: Product = {}): Product => ({
  id: "p-icon",
  slug: "icon",
  title: "Icon of the Theotokos",
  subtitle: "Hand-painted",
  status: "published",
  inventory_status: "ready_to_ship",
  quantity_available: 5,
  price_cents: 4500,
  currency: "usd",
  store_id: EIKON,
  seller_id: "seller-1",
  classification: "painted",
  category: "icons",
  media: [{ media_url: "https://cdn.example/icon.jpg" }],
  ...over,
});

const state = vi.hoisted(() => ({
  enabled: true,
  products: {} as Record<string, Record<string, unknown>>,
  payouts: null as null | Record<string, unknown>,
  proUntil: null as string | null,
  itemsErrors: [] as (null | { message: string })[],
  stripeFails: false,
  writes: [] as { table: string; op: string; values: unknown; where?: [string, unknown][] }[],
  sessions: [] as Record<string, unknown>[],
  fees: [] as unknown[],
}));

vi.mock("@/lib/shop/eikon", async (orig) => ({ ...(await orig<typeof import("@/lib/shop/eikon")>()), EIKON_STORE_ID: "eikon-store", isEikonProduct: (p: { store_id?: string }) => p?.store_id === "eikon-store" }));
vi.mock("@/lib/shop/flags", () => ({ checkoutEnabled: () => state.enabled }));
vi.mock("@/lib/shop/catalog", () => ({ getProduct: async (slug: string) => state.products[slug] ?? null }));
vi.mock("@/lib/shop/cartDealServer", () => ({ activeDealsForCart: async () => ({}) }));
vi.mock("@/lib/shop/settings", async (orig) => ({
  ...(await orig<typeof import("@/lib/shop/settings")>()),
  readShopSettings: async () => ({
    settings: {
      cartDeal: { enabled: false },
      setDiscount: { enabled: false, percent: 0 },
      multiBuy: { enabled: false, minItems: 0, percent: 0, steps: [] },
      freeShippingThresholdCents: null,
    },
  }),
}));
vi.mock("@/lib/shop/payouts", () => ({
  getStorePayouts: async () => state.payouts,
  recordOrderFee: async (fee: unknown) => void state.fees.push(fee),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: table === "entitlements" ? { pro_until: state.proUntil } : table === "shop_sellers" ? { seller_type: "purify" } : null,
            }),
          }),
        }),
        insert(values: unknown) {
          state.writes.push({ table, op: "insert", values });
          if (table === "shop_orders") return { select: () => ({ single: async () => ({ data: { id: "order-1" }, error: null }) }) };
          if (table === "shop_order_items") return Promise.resolve({ error: state.itemsErrors.shift() ?? null });
          return Promise.resolve({ error: null });
        },
        update(values: unknown) {
          const where: [string, unknown][] = [];
          const write = { table, op: "update", values, where };
          state.writes.push(write);
          const chain = {
            eq(col: string, val: unknown) {
              where.push([col, val]);
              return Object.assign(Promise.resolve({ error: null }), chain);
            },
          };
          return chain;
        },
      };
    },
  }),
}));
vi.mock("stripe", () => ({
  default: class {
    checkout = {
      sessions: {
        create: async (args: Record<string, unknown>) => {
          state.sessions.push(args);
          if (state.stripeFails) throw new Error("card network down");
          return { id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" };
        },
      },
    };
  },
}));

const { createCheckout, flatShippingCents } = await import("@/lib/shop/checkout");
const BUYER = { id: "55555555-5555-4555-8555-555555555555", email: "buyer@example.com" };
const ORIGIN = "https://purifyapp.net";

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  delete process.env.SHOP_FLAT_SHIPPING_CENTS;
  state.enabled = true;
  state.products = { icon: icon(), candle: icon({ id: "p-candle", slug: "candle", title: "Beeswax candles", price_cents: 1200, classification: "candle", category: "candles" }) };
  state.payouts = null;
  state.proUntil = null;
  state.itemsErrors = [];
  state.stripeFails = false;
  state.writes.length = 0;
  state.sessions.length = 0;
  state.fees.length = 0;
});

const orderInsert = () => state.writes.find((w) => w.table === "shop_orders" && w.op === "insert")?.values as Record<string, unknown>;

describe("createCheckout", () => {
  it("answers disabled while checkout is dark, and refuses an empty cart, writing nothing", async () => {
    state.enabled = false;
    expect(await createCheckout([{ productSlug: "icon", quantity: 1 }], BUYER, ORIGIN)).toEqual({ ok: false, disabled: true });
    state.enabled = true;
    expect(await createCheckout([], BUYER, ORIGIN)).toMatchObject({ ok: false });
    expect(state.writes).toHaveLength(0);
  });

  it("refuses the whole cart on the first line it cannot sell, before any order exists", async () => {
    state.products.gone = icon({ slug: "gone", status: "draft" });
    state.products.soon = icon({ slug: "soon", inventory_status: "coming_soon" });
    state.products.few = icon({ slug: "few", quantity_available: 1 });
    state.products.other = icon({ slug: "other", store_id: "another-store" });
    state.products.euro = icon({ slug: "euro", currency: "eur" });
    expect(await createCheckout([{ productSlug: "nowhere", quantity: 1 }], BUYER, ORIGIN)).toMatchObject({ ok: false, reason: expect.stringMatching(/isn't available/) });
    expect(await createCheckout([{ productSlug: "gone", quantity: 1 }], BUYER, ORIGIN)).toMatchObject({ ok: false });
    expect(await createCheckout([{ productSlug: "soon", quantity: 1 }], BUYER, ORIGIN)).toMatchObject({ reason: expect.stringMatching(/can't be purchased yet/) });
    expect(await createCheckout([{ productSlug: "few", quantity: 2 }], BUYER, ORIGIN)).toMatchObject({ reason: expect.stringMatching(/Not enough stock/) });
    expect(await createCheckout([{ productSlug: "icon", quantity: 1 }, { productSlug: "other", quantity: 1 }], BUYER, ORIGIN)).toMatchObject({ reason: expect.stringMatching(/one store at a time/) });
    expect(await createCheckout([{ productSlug: "icon", quantity: 1 }, { productSlug: "euro", quantity: 1 }], BUYER, ORIGIN)).toMatchObject({ reason: expect.stringMatching(/one currency at a time/) });
    expect(state.writes).toHaveLength(0);
    expect(state.sessions).toHaveLength(0);
  });

  it("charges the database's prices and the flat shipping, writes the order first, and gives Stripe our order's id", async () => {
    const result = await createCheckout([{ productSlug: "icon", quantity: 2 }, { productSlug: "candle", quantity: 1 }], BUYER, ORIGIN);
    expect(result).toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/cs_test_1", orderId: "order-1" });
    const order = orderInsert();
    expect(order).toMatchObject({ user_id: BUYER.id, email: BUYER.email, items_total_cents: 2 * 4500 + 1200, shipping_cents: flatShippingCents(), payment_status: "pending" });
    expect(order.total_cents).toBe(2 * 4500 + 1200 + flatShippingCents());
    const session = state.sessions[0] as {
      client_reference_id: string;
      metadata: Record<string, string>;
      line_items: { quantity: number; price_data: { unit_amount: number } }[];
      success_url: string;
      cancel_url: string;
      payment_intent_data?: unknown;
    };
    expect(session.client_reference_id).toBe("order-1");
    expect(session.metadata.order_id).toBe("order-1");
    expect(session.line_items.map((l) => [l.quantity, l.price_data.unit_amount])).toEqual([
      [2, 4500],
      [1, 1200],
    ]);
    expect(session.success_url).toBe(`${ORIGIN}/shop/checkout/success?order=order-1`);
    expect(session.cancel_url).toBe(`${ORIGIN}/shop/checkout/cancelled?order=order-1&from=cart`);
    // Purify's own store: no destination, no fee.
    expect(session.payment_intent_data).toBeUndefined();
    // The session is remembered on the order, and the clickwrap with the order.
    expect(state.writes.find((w) => w.table === "shop_orders" && w.op === "update")?.values).toEqual({ stripe_session_id: "cs_test_1" });
    expect(state.writes.find((w) => w.table === "terms_acceptances")?.values).toMatchObject({ context: "checkout", order_id: "order-1", user_id: BUYER.id });
  });

  it("ships free for a member who holds Pro", async () => {
    state.proUntil = new Date(Date.now() + 30 * 86_400_000).toISOString();
    await createCheckout([{ productSlug: "icon", quantity: 1 }], BUYER, ORIGIN);
    expect(orderInsert().shipping_cents).toBe(0);
  });

  it("never sends an order with no lines to Stripe: it is cancelled as the cancel route cancels", async () => {
    state.itemsErrors = [{ message: "insert failed" }];
    const result = await createCheckout([{ productSlug: "icon", quantity: 1 }], BUYER, ORIGIN);
    expect(result).toMatchObject({ ok: false });
    expect(state.sessions).toHaveLength(0);
    const cancel = state.writes.find((w) => w.table === "shop_orders" && w.op === "update");
    expect(cancel?.values).toMatchObject({ payment_status: "cancelled", fulfillment_status: "cancelled" });
    expect(cancel?.where).toEqual([
      ["id", "order-1"],
      ["payment_status", "pending"],
    ]);
  });

  it("answers a failure, not a throw, when Stripe refuses the session", async () => {
    state.stripeFails = true;
    expect(await createCheckout([{ productSlug: "icon", quantity: 1 }], BUYER, ORIGIN)).toEqual({ ok: false, reason: "Couldn't start checkout. Please try again." });
  });

  it("sends a connected seller's charge to them, keeps Purify's fee, and records the fee only after the session exists", async () => {
    state.products.cross = icon({ slug: "cross", store_id: "seller-store", price_cents: 10000, classification: "metal", category: "crosses" });
    state.payouts = { stripe_account_id: "acct_seller", charges_enabled: true, payouts_enabled: true, commission_rate_bps: 1000 };
    await createCheckout([{ productSlug: "cross", quantity: 1 }], BUYER, ORIGIN);
    const session = state.sessions[0] as { payment_intent_data: { application_fee_amount: number; transfer_data: { destination: string }; on_behalf_of: string } };
    expect(session.payment_intent_data.transfer_data.destination).toBe("acct_seller");
    expect(session.payment_intent_data.on_behalf_of).toBe("acct_seller");
    expect(session.payment_intent_data.application_fee_amount).toBeGreaterThan(0);
    expect(state.fees).toHaveLength(1);
    expect(state.fees[0]).toMatchObject({ order_id: "order-1", stripe_account_id: "acct_seller", commission_rate_bps: 1000 });
  });
});
