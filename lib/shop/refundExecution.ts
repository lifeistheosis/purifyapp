import "server-only";

import { checkoutEnabled } from "./flags";
import {
  canFlipRefunded,
  guardedOrderUpdate,
  readOrderState,
  type OrderWriteDb,
} from "./orderWrite";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The one place refund money actually moves. Both deciders (the seller
 * console route and the admin marketplace route) call these, so the Stripe
 * behaviour, the parked-"approved" fallback, and the order-flipping can never
 * drift apart between the two surfaces.
 *
 * THE HEADER USED TO SAY "every UPDATE carries a status guard so a
 * double-click or a seller/admin race settles a request exactly once". The
 * guards were there and the sentence was still false, because a guard that is
 * not read back is not a guard: PostgREST reports no error for an UPDATE that
 * matched nothing, so `!error` was true whether the row moved or not.
 *
 * That mattered here more than anywhere else in the codebase, because money
 * moved BEFORE the request was claimed. Both deciders pre-check independently,
 * and requestedAmountCents honours a partial amount_cents, so two concurrent
 * approvals of the same request both reached stripe.refunds.create and both
 * succeeded. The buyer was refunded twice and the second guarded UPDATE
 * reported success while changing nothing.
 *
 * The order is now CLAIM, SPEND, SETTLE:
 *
 *   1. requested -> approved, judged by rows matched. Whoever loses this never
 *      reaches Stripe. It uses `approved` rather than a new `approving` state
 *      because the CHECK constraint at 20260705_shop_seller_console.sql:159
 *      allows only requested/approved/declined/processed/cancelled, and
 *      `approved` already means exactly "decided, money not yet confirmed".
 *   2. stripe.refunds.create, with an idempotency key derived from the request
 *      id, so a retry of the same decision cannot charge twice even if step 1
 *      is somehow bypassed in future.
 *   3. approved -> processed once the money is confirmed gone.
 *
 * A crash between 1 and 3 parks the request at `approved`, which is a state
 * the admin console already renders and can settle by hand. That is the
 * failure this shape is designed to have.
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
  const { data, error } = await admin
    .from("shop_refund_requests")
    .update({
      status: "declined",
      resolution_note: note,
      decided_at: now,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("status", "requested")
    .select("id");
  if (error) {
    console.warn("[shop] refund decline failed", error.message);
    return false;
  }
  // Rows matched, not "no error". A decline that lost to a concurrent approve
  // used to return true, so the seller was told "declined" while the money had
  // already gone back to the buyer.
  if (!data || data.length === 0) {
    console.warn(`[shop] refund decline lost a race request=${requestId}`);
    return false;
  }
  return true;
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
): Promise<"processed" | "approved" | "already-decided" | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const amount = await requestedAmountCents(requestId, order.total_cents);

  // 1. CLAIM, before a penny moves. Whoever loses this returns without ever
  //    reaching Stripe, which is the whole point: the previous order of
  //    operations refunded first and claimed afterwards.
  const { data: claimed, error: claimErr } = await admin
    .from("shop_refund_requests")
    .update({
      status: "approved",
      amount_cents: amount,
      resolution_note: note,
      decided_at: now,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("status", "requested")
    .select("id");
  if (claimErr) {
    console.warn("[shop] refund claim failed", claimErr.message);
    return null;
  }
  if (!claimed || claimed.length === 0) {
    // Another decider already has it. Not an error, and emphatically not a
    // second refund.
    console.warn(`[shop] refund already decided request=${requestId}`);
    return "already-decided";
  }

  // 2. SPEND. The idempotency key is belt to the claim's braces: even if a
  //    future change lets two callers past step 1, Stripe itself refuses the
  //    second charge for 24 hours rather than paying the buyer twice.
  let processed = false;
  let stripeRefundId: string | null = null;
  if (checkoutEnabled() && order.stripe_payment_intent) {
    try {
      const { default: Stripe } = await import("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const refund = await stripe.refunds.create(
        { payment_intent: order.stripe_payment_intent, amount },
        { idempotencyKey: `purify:refund:${requestId}` },
      );
      stripeRefundId = refund.id;
      processed = true;
    } catch (e) {
      // The claim stands and the request is parked at `approved`, which the
      // admin console renders and can settle by hand. Never fail the decision
      // because Stripe hiccuped.
      console.warn("[shop] stripe refund failed", (e as Error).message);
    }
  }

  if (!processed) return "approved";

  // 3. SETTLE. approved -> processed, judged by rows matched like the rest.
  const { data: settled, error: settleErr } = await admin
    .from("shop_refund_requests")
    .update({
      status: "processed",
      stripe_refund_id: stripeRefundId,
      processed_at: now,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("status", "approved")
    .select("id");
  if (settleErr || !settled || settled.length === 0) {
    // The money is GONE and the row did not move. Loud, because this is the
    // one state a human has to reconcile by hand.
    console.error(
      `[shop] REFUND SENT BUT NOT RECORDED request=${requestId} stripe=${stripeRefundId} amount=${amount}. Needs review.`,
    );
    return "processed";
  }

  if (amount >= order.total_cents) {
    await flipOrderRefunded(order.id, now);
  }
  return "processed";
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
  const { data, error } = await admin
    .from("shop_refund_requests")
    .update({
      status: "processed",
      amount_cents: amount,
      processed_at: now,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("status", "approved")
    .select("id");
  if (error) {
    console.warn("[shop] refund mark-processed failed", error.message);
    return false;
  }
  // Rows matched. Without this, settling a request someone else had already
  // settled reported success and flipped the order a second time.
  if (!data || data.length === 0) {
    console.warn(`[shop] refund mark-processed lost a race request=${requestId}`);
    return false;
  }
  if (amount >= order.total_cents) await flipOrderRefunded(order.id, now);
  return true;
}

export type OrderFlipResult =
  | "flipped" // the row now reads refunded
  | "not-refundable" // it never held money we could hand back
  | "lost-race" // it kept moving under us; the stamp did not land
  | "failed"; // the database refused the write, or the read failed

/**
 * Stamp the order refunded, guarded on the payment_status just read and judged
 * by rows matched.
 *
 * Guarded on payment_status ONLY, never on fulfillment_status: a refund can
 * land at any fulfillment stage, so guarding that column would refuse a
 * legitimate concurrent shipping update.
 *
 * This used to be a bare `.eq("id", orderId)` whose result was discarded
 * entirely, in a function returning void, called by two paths that returned
 * true regardless. It ran AFTER money left Stripe, which is exactly where a
 * silent no-op is least affordable.
 *
 * `db` is injected so this is testable; vitest collects lib/** only.
 */
export async function flipOrderRefunded(
  orderId: string,
  now: string,
  db: OrderWriteDb = createAdminClient() as unknown as OrderWriteDb,
): Promise<OrderFlipResult> {
  const read = await readOrderState(db, orderId);
  // A read that FAILED is not an order that is ABSENT. Never log "refund for a
  // missing order" on a database blip.
  if (!read.ok) {
    console.warn("[shop] refund order read failed", read.message);
    return "failed";
  }
  if (!read.state) {
    console.error(`[shop] REFUND FOR A MISSING ORDER order=${orderId}. Needs review.`);
    return "not-refundable";
  }
  if (!canFlipRefunded(read.state.payment_status)) {
    console.error(
      `[shop] REFUND AGAINST AN UNPAID ORDER order=${orderId} payment='${read.state.payment_status}'. Needs review.`,
    );
    return "not-refundable";
  }

  const result = await guardedOrderUpdate(
    db,
    orderId,
    { payment_status: read.state.payment_status },
    {
      payment_status: "refunded",
      fulfillment_status: "refunded",
      refund_status: "refunded",
      updated_at: now,
    },
  );
  if (result.ok) return "flipped";
  if (result.reason === "error") {
    console.error(
      `[shop] REFUND SENT BUT ORDER NOT STAMPED order=${orderId}: ${result.message}. Needs review.`,
    );
    return "failed";
  }
  console.error(
    `[shop] REFUND SENT BUT ORDER MOVED order=${orderId} found='${result.found?.payment_status}'. Needs review.`,
  );
  return "lost-race";
}
