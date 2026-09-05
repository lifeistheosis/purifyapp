import { describe, expect, it } from "vitest";
import type Stripe from "stripe";

import { rangeFrom, summarise, toRow } from "@/lib/billing/stripeLedger";

// Loosely typed on purpose: the SDK's Charge type follows the newest API
// version, where `invoice` is no longer on the charge, and the mapper has
// to accept both the old and the new shape.
function bt(partial: Record<string, unknown>): Stripe.BalanceTransaction {
  return {
    id: "txn_1",
    object: "balance_transaction",
    amount: 499,
    fee: 45,
    net: 454,
    currency: "usd",
    created: 1_756_000_000,
    type: "charge",
    description: null,
    source: null,
    ...partial,
  } as unknown as Stripe.BalanceTransaction;
}

const orders = new Map([["pi_shop", "order-1"]]);

describe("toRow", () => {
  it("labels a charge with an invoice as a subscription", () => {
    const r = toRow(bt({ source: { object: "charge", invoice: "in_1", payment_intent: "pi_x" } }), orders);
    expect(r.match).toBe("subscription");
    expect(r.ref).toBe("in_1");
  });

  it("labels a charge whose intent is a shop order", () => {
    const r = toRow(bt({ source: { object: "charge", payment_intent: "pi_shop", receipt_email: "a@b.c" } }), orders);
    expect(r.match).toBe("shop-order");
    expect(r.ref).toBe("order-1");
    expect(r.email).toBe("a@b.c");
  });

  it("names a subscription through the invoice map when the charge carries no invoice", () => {
    const invoices = new Map([["pi_sub", "in_42"]]);
    const r = toRow(bt({ source: { object: "charge", payment_intent: "pi_sub" } }), orders, invoices);
    expect(r.match).toBe("subscription");
    expect(r.ref).toBe("in_42");
  });

  it("leaves a charge the books cannot place as other", () => {
    const r = toRow(bt({ source: { object: "charge", payment_intent: "pi_unknown" } }), orders);
    expect(r.match).toBe("other");
    expect(r.ref).toBeNull();
  });

  it("reaches through a refund to its charge", () => {
    const r = toRow(
      bt({ type: "refund", amount: -499, fee: 0, net: -499, source: { object: "refund", charge: { id: "ch_1", invoice: "in_9" } } }),
      orders,
    );
    expect(r.match).toBe("refund");
    expect(r.ref).toBe("in_9");
  });

  it("labels payouts and fees", () => {
    expect(toRow(bt({ type: "payout", amount: -1000, net: -1000 }), orders).match).toBe("payout");
    expect(toRow(bt({ type: "stripe_fee", amount: -200, net: -200 }), orders).match).toBe("fee");
  });
});

describe("summarise", () => {
  it("adds every stream and subtracts refunds from the stream they belong to", () => {
    const rows = [
      toRow(bt({ id: "1", source: { object: "charge", invoice: "in_1" } }), orders), // subscription 499
      toRow(bt({ id: "2", amount: 1200, fee: 65, net: 1135, source: { object: "charge", payment_intent: "pi_shop" } }), orders), // shop 1200
      toRow(bt({ id: "3", amount: 300, fee: 39, net: 261, source: { object: "charge", payment_intent: "pi_lost" } }), orders), // unmatched
      toRow(bt({ id: "4", type: "refund", amount: -499, fee: 0, net: -499, source: { object: "refund", charge: { id: "ch", invoice: "in_1" } } }), orders),
      toRow(bt({ id: "5", type: "payout", amount: -1000, fee: 0, net: -1000 }), orders),
    ];
    const s = summarise(rows);
    expect(s.count).toBe(5);
    expect(s.chargesCents).toBe(1999);
    expect(s.refundsCents).toBe(499);
    expect(s.feesCents).toBe(149);
    expect(s.payoutsCents).toBe(1000);
    expect(s.subscriptionsCents).toBe(0);
    expect(s.shopCents).toBe(1200);
    expect(s.unmatchedCents).toBe(300);
    expect(s.unmatchedCount).toBe(1);
    expect(s.netCents).toBe(454 + 1135 + 261 - 499 - 1000);
    expect(s.byType.charge.count).toBe(3);
  });
});

describe("rangeFrom", () => {
  const now = new Date("2026-09-05T12:00:00Z");
  it("maps the tab vocabulary", () => {
    expect(rangeFrom("all", now)).toBeUndefined();
    expect(rangeFrom("nonsense", now)).toBeUndefined();
    expect(rangeFrom("ytd", now)).toBe(Math.floor(Date.UTC(2026, 0, 1) / 1000));
    expect(rangeFrom("7d", now)).toBe(Math.floor(now.getTime() / 1000) - 7 * 86_400);
  });
});
