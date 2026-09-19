/**
 * Abandoned checkouts, cleared on their own.
 *
 * Every checkout creates its order row before Stripe opens (so the webhook
 * always has a row to settle), which means every checkout someone walks away
 * from leaves a `pending` order behind. On 2026-09-19 production held 38 of
 * them against 3 paid orders, some already stamped "awaiting sourcing", and
 * the Overview carried them as a standing "checkouts opened and never paid"
 * queue that only a manual press ever cleared, and that press did not.
 *
 * This decides, per stale order, what Stripe's own answer allows:
 *
 *   paid              settle it: the webhook missed a real payment
 *   open              expire the session in Stripe, then cancel
 *   expired           cancel: an expired session can never be paid
 *   complete, unpaid  leave it: a delayed payment method is still clearing,
 *                     and the webhook settles it when it does
 *   unreadable        leave it and say so: nothing is decided without Stripe
 *   no session        cancel: checkout never reached Stripe, so nobody can pay
 *
 * STALE means older than Stripe's own 24 hour session life plus a margin, so
 * nothing here races a buyer who is still on the payment page. And a payment
 * that somehow lands after a cancel still wins (F-01 in docs/audit): the
 * settlement recovers a cancelled order to paid.
 *
 * Pure: the orders, the clock and Stripe's answers are inputs.
 */

/** Stripe's default Checkout Session life is 24 hours; this waits past it. */
export const ABANDON_AFTER_MS = 25 * 3_600_000;

export type SessionState = "paid" | "open" | "expired" | "complete_unpaid" | "unreadable" | "none";

export type AbandonAction = "settle" | "expire_then_cancel" | "cancel" | "leave";

/** Stripe's session, reduced to what the decision needs. */
export function sessionState(
  session: { status?: string | null; payment_status?: string | null } | null,
  hadSessionId: boolean,
): SessionState {
  if (!hadSessionId) return "none";
  if (!session) return "unreadable";
  if (session.payment_status === "paid") return "paid";
  if (session.status === "open") return "open";
  if (session.status === "expired") return "expired";
  if (session.status === "complete") return "complete_unpaid";
  return "unreadable";
}

export function decideAbandoned(state: SessionState): AbandonAction {
  switch (state) {
    case "paid":
      return "settle";
    case "open":
      return "expire_then_cancel";
    case "expired":
    case "none":
      return "cancel";
    default:
      return "leave";
  }
}

/** Old enough to be abandoned, by the order's own creation time. */
export function isStale(createdAt: string, now: number): boolean {
  const t = Date.parse(createdAt);
  return Number.isFinite(t) && now - t > ABANDON_AFTER_MS;
}
