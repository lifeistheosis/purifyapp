import "server-only";

import { checkoutEnabled } from "./flags";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The one place refund money actually moves. Both deciders (the seller
 * console route and the admin marketplace route) call these, so the
 * Stripe behavior, the parked-"approved" fallback, and the
 * order-flipping can never drift apart between the two surfaces.
 *
 * Every UPDATE carries a status guard so a double-click or a
 * seller/admin race settles a request exactly once.
 */

export type RefundOrderFacts = {
  id: string;
  total_cents: number;
  stripe_payment_intent: string | null;
};

export async function declineRefundRequest(
  requestId: string,
  note: string | null,
): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("shop_refund_requests")
    .update({
      status: "declined",
      resolution_note: note,
      decided_at: now,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("status", "requested");
  if (error) console.warn("[shop] refund decline failed", error.message);
  return !error;
}

/**
 * The amount a request is actually asking for: its own amount_cents when
 * present, clamped to the order total; the full total otherwise. Reading
 * it here (not trusting the caller) keeps partial refunds honest in both
 * decider surfaces.
 */
async function requestedAmountCents(
  requestId: string,
  orderTotal: number,
): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("shop_refund_requests")
    .select("amount_cents")
    .eq("id", requestId)
    .maybeSingle();
  const requested = data?.amount_cents;
  if (typeof requested === "number" && requested > 0) {
    return Math.min(requested, orderTotal);
  }
  return orderTotal;
}

/**
 * Approve and, when possible, execute. Returns the resulting status:
 * 'processed' when the money moved, 'approved' when it parked for
 * manual settlement, null on failure. Honors the request's own
 * amount_cents (a partial refund refunds the partial amount); the order
 * flips to refunded only when the full total moved.
 */
export async function approveRefundRequest(
  requestId: string,
  order: RefundOrderFacts,
  note: string | null,
): Promise<"processed" | "approved" | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const amount = await requestedAmountCents(requestId, order.total_cents);

  let processed = false;
  let stripeRefundId: string | null = null;
  if (checkoutEnabled() && order.stripe_payment_intent) {
    try {
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent,
        amount,
      });
      stripeRefundId = refund.id;
      processed = true;
    } catch (e) {
      // Approval stands; the money moves manually. Never fail the
      // decision because Stripe hiccuped.
      console.warn("[shop] stripe refund failed", (e as Error).message);
    }
  }

  const { error } = await admin
    .from("shop_refund_requests")
    .update({
      status: processed ? "processed" : "approved",
      amount_cents: amount,
      resolution_note: note,
      stripe_refund_id: stripeRefundId,
      decided_at: now,
      processed_at: processed ? now : null,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("status", "requested");
  if (error) {
    console.warn("[shop] refund approve failed", error.message);
    return null;
  }

  if (processed && amount >= order.total_cents) {
    await flipOrderRefunded(order.id, now);
  }
  return processed ? "processed" : "approved";
}

/**
 * Settle a parked 'approved' request after the money moved outside
 * Stripe-from-here (manual dashboard refund, check in the mail…).
 */
export async function markRefundProcessed(
  requestId: string,
  order: RefundOrderFacts,
): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const amount = await requestedAmountCents(requestId, order.total_cents);
  const { error } = await admin
    .from("shop_refund_requests")
    .update({
      status: "processed",
      amount_cents: amount,
      processed_at: now,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("status", "approved");
  if (error) {
    console.warn("[shop] refund mark-processed failed", error.message);
    return false;
  }
  if (amount >= order.total_cents) await flipOrderRefunded(order.id, now);
  return true;
}

async function flipOrderRefunded(orderId: string, now: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("shop_orders")
    .update({
      payment_status: "refunded",
      fulfillment_status: "refunded",
      refund_status: "refunded",
      updated_at: now,
    })
    .eq("id", orderId);
}
