// The Stripe webhook route (audit F-09): the signature, then each event to
// its settlement and its answer. The settlement's money rules (amounts, payment
// over cancellation, money arrived) are tested in webhookSettlement.test.ts;
// this holds the door: nothing unsigned gets in, and a write that failed is
// answered 500 so Stripe sends it again.

import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "whsec_test_secret";

const state = vi.hoisted(() => ({
  settle: "paid" as import("@/lib/shop/webhookSettlement").SettleResult,
  gift: "granted" as string,
  capabilities: "updated" as string,
  ambassador: false,
  settled: [] as unknown[][],
  gifts: [] as unknown[],
  accounts: [] as unknown[][],
  alerts: [] as unknown[],
  lowStock: [] as unknown[],
  notified: [] as unknown[],
}));

vi.mock("@/lib/shop/webhookSettlement", () => ({
  settleCheckoutSession: async (...args: unknown[]) => {
    state.settled.push(args);
    return state.settle;
  },
  orderIdOf: (s: { client_reference_id?: string }) => s.client_reference_id ?? null,
}));
vi.mock("@/lib/gifts/purchase", () => ({
  isGiftSession: (s: { metadata?: Record<string, string> }) => s?.metadata?.kind === "gift",
  settleGiftSession: async (_db: unknown, s: unknown) => {
    state.gifts.push(s);
    return state.gift;
  },
  giftOf: () => ({ recipientId: "r", buyerId: "b", days: 30, fromName: "Anna", fromHandle: "anna" }),
}));
vi.mock("@/lib/shop/payouts", () => ({
  applyAccountCapabilities: async (...args: unknown[]) => {
    state.accounts.push(args);
    return state.capabilities;
  },
}));
vi.mock("@/lib/ambassadors/stripeAccount", () => ({ syncAmbassadorAccount: async () => state.ambassador }));
vi.mock("@/lib/shop/orderEmails", () => ({ sendOrderConfirmationEmail: async () => {} }));
vi.mock("@/lib/shop/lowStockServer", () => ({ alertLowStockAfterSale: async (_db: unknown, id: unknown) => void state.lowStock.push(id) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/admin/ownerAlert", () => ({ notifyOwner: async (a: unknown) => void state.alerts.push(a), saleAlert: (amount: number, cur: string) => ({ amount, cur }) }));
vi.mock("@/lib/admin/activityLog", () => ({ logActivity: async () => {} }));
vi.mock("@/lib/community/notify", () => ({ insertNotifications: async (_db: unknown, rows: unknown) => void state.notified.push(rows) }));

const { POST } = await import("@/app/api/shop/stripe-webhook/route");
const signer = new Stripe("sk_test_x");

function event(type: string, object: Record<string, unknown>) {
  return { id: "evt_test", object: "event", type, created: 1_800_000_000, data: { object } };
}
function deliver(body: unknown, { signed = true, secret = SECRET } = {}) {
  const payload = JSON.stringify(body);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signed) headers["stripe-signature"] = signer.webhooks.generateTestHeaderString({ payload, secret });
  return POST(new Request("https://purifyapp.net/api/shop/stripe-webhook", { method: "POST", headers, body: payload }));
}

beforeEach(() => {
  process.env.STRIPE_WEBHOOK_SECRET = SECRET;
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  state.settle = "paid";
  state.gift = "granted";
  state.capabilities = "updated";
  state.ambassador = false;
  for (const list of [state.settled, state.gifts, state.accounts, state.alerts, state.lowStock, state.notified]) list.length = 0;
});

describe("the Stripe webhook", () => {
  it("does nothing while Stripe is not set up, and lets nothing unsigned or wrongly signed in", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect((await deliver(event("checkout.session.completed", {}))).status).toBe(503);
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    expect((await deliver(event("checkout.session.completed", {}), { signed: false })).status).toBe(400);
    expect((await deliver(event("checkout.session.completed", {}), { secret: "whsec_someone_else" })).status).toBe(400);
    expect(state.settled).toHaveLength(0);
  });

  it("settles a completed checkout with the event's own time, tells the owner of the sale and checks the stock", async () => {
    const session = { id: "cs_1", client_reference_id: "order-1", amount_total: 4500, currency: "usd", payment_status: "paid" };
    const res = await deliver(event("checkout.session.completed", session));
    expect(await res.json()).toEqual({ received: true, result: "paid" });
    const [, sendEmail, settledSession, created] = state.settled[0];
    expect(typeof sendEmail).toBe("function");
    expect(settledSession).toMatchObject({ id: "cs_1", amount_total: 4500 });
    expect(created).toBe(1_800_000_000);
    expect(state.alerts).toEqual([{ amount: 4500, cur: "usd" }]);
    expect(state.lowStock).toEqual(["order-1"]);
  });

  it("settles a payment that clears later the same way", async () => {
    const res = await deliver(event("checkout.session.async_payment_succeeded", { id: "cs_2", client_reference_id: "order-2" }));
    expect(res.status).toBe(200);
    expect(state.settled).toHaveLength(1);
  });

  it("answers 500 when the order could not be written, so Stripe sends it again, and tells nobody of a sale", async () => {
    state.settle = "update-failed";
    expect((await deliver(event("checkout.session.completed", { id: "cs_3", client_reference_id: "order-3" }))).status).toBe(500);
    expect(state.alerts).toHaveLength(0);
  });

  it("tells no one of a sale that did not settle as one (money not yet arrived, a repeat, an amount that does not match)", async () => {
    for (const result of ["awaiting-payment", "retry-noop", "amount-mismatch", "order-missing", "ignored-status"]) {
      state.settle = result as typeof state.settle;
      const res = await deliver(event("checkout.session.completed", { id: "cs_4", client_reference_id: "order-4" }));
      expect(await res.json()).toEqual({ received: true, result });
    }
    expect(state.alerts).toHaveLength(0);
    expect(state.lowStock).toHaveLength(0);
  });

  it("settles a gift as a gift, never as a shop order, and answers 500 when it could not be written", async () => {
    const gift = { id: "cs_gift", metadata: { kind: "gift" }, amount_total: 999, currency: "usd" };
    expect((await deliver(event("checkout.session.completed", gift))).status).toBe(200);
    expect(state.gifts).toHaveLength(1);
    expect(state.settled).toHaveLength(0);
    expect(state.notified).toHaveLength(1);
    state.gift = "failed";
    expect((await deliver(event("checkout.session.completed", gift))).status).toBe(500);
  });

  it("mirrors a connected account's capabilities from Stripe's own word, and answers 500 when that write fails", async () => {
    const account = { id: "acct_1", object: "account", charges_enabled: true, payouts_enabled: false };
    expect((await deliver(event("account.updated", account))).status).toBe(200);
    expect(state.accounts[0]).toEqual(["acct_1", { chargesEnabled: true, payoutsEnabled: false }]);
    state.capabilities = "failed";
    expect((await deliver(event("account.updated", account))).status).toBe(500);
  });

  it("acknowledges an event it does not handle, writing nothing", async () => {
    const res = await deliver(event("customer.created", { id: "cus_1" }));
    expect(await res.json()).toEqual({ received: true });
    expect(state.settled).toHaveLength(0);
    expect(state.accounts).toHaveLength(0);
  });
});
