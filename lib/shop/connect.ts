/**
 * Stripe Connect: the pure part.
 *
 * No "server-only" and no imports with side effects, on purpose. vitest
 * collects lib/** and nothing else, so every rule about money that CAN be a
 * pure function is one, and the routes are left holding only I/O. This is the
 * same split lib/shop/webhookSettlement.ts and lib/shop/orderWrite.ts made
 * after audit F-01.
 *
 * ── The charge shape ────────────────────────────────────────────────────
 *
 * Destination charges: the charge is created on Purify's account with
 * transfer_data.destination and on_behalf_of pointing at the seller's
 * connected account. That combination makes the SELLER the settlement
 * merchant, which is what the owner decided when they chose that sellers
 * absorb refunds and chargebacks: a dispute is raised against the seller's
 * balance, not Purify's, and the seller's descriptor is what a buyer sees on
 * their statement.
 *
 * ── What the commission is charged on ───────────────────────────────────
 *
 * The item total. Not shipping, not tax.
 *
 * That is a decision with money attached, so it is written here rather than
 * left implicit in an expression. Sellers ship their own goods, which means
 * the seller pays the carrier; taking a cut of the postage they paid for would
 * be charging them a fee on their own cost. Under a destination charge the
 * whole amount transfers minus the application fee, so excluding shipping from
 * the fee automatically routes the shipping money to the seller who earned it.
 *
 * This also settles the inconsistency the marketplace plan flagged: shipping
 * was already credited to the seller through shop_orders.total_cents while the
 * cash stayed in Purify's balance. It now goes where the credit always said it
 * went.
 *
 * If that decision is reversed, change commissionBaseCents() and nothing else.
 */

/** The owner's floor: 10%. Also a CHECK in 20260824_shop_connect.sql. */
export const COMMISSION_FLOOR_BPS = 1000;

/**
 * Not a policy, a typo guard. A rate above half is far likelier to be a
 * misplaced digit than an intention. Matches the same CHECK.
 */
export const COMMISSION_CEILING_BPS = 5000;

export const DEFAULT_COMMISSION_BPS = COMMISSION_FLOOR_BPS;

/** Connect state for one store, as this app stores it. */
export type StorePayouts = {
  stripe_account_id: string | null;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  commission_rate_bps: number;
  onboarding_started_at?: string | null;
};

/**
 * Reject a rate rather than silently clamping it. A clamp would turn a typed
 * "100" (meaning 100%) into 10% and let a store trade on a rate nobody chose;
 * an admin who sees an error retypes it.
 */
export function isValidCommissionBps(bps: number): boolean {
  return (
    Number.isInteger(bps) &&
    bps >= COMMISSION_FLOOR_BPS &&
    bps <= COMMISSION_CEILING_BPS
  );
}

/** What the commission rate is applied to. See the header. */
export function commissionBaseCents(order: {
  itemsTotalCents: number;
  shippingCents?: number;
  taxCents?: number;
}): number {
  return Math.max(0, Math.round(order.itemsTotalCents));
}

/**
 * The application fee in cents, rounded to the nearest cent and never allowed
 * to exceed the amount actually charged.
 *
 * The clamp is not decoration. Stripe rejects a session whose
 * application_fee_amount exceeds the charge, and a rejected session is a
 * checkout the buyer cannot complete. It cannot trigger with a sane rate, and
 * that is exactly why it must be here: the case that cannot happen is the one
 * nobody notices breaking.
 */
export function applicationFeeCents(input: {
  itemsTotalCents: number;
  shippingCents?: number;
  taxCents?: number;
  commissionRateBps: number;
}): number {
  const base = commissionBaseCents(input);
  const total =
    base + Math.max(0, input.shippingCents ?? 0) + Math.max(0, input.taxCents ?? 0);
  const fee = Math.round((base * input.commissionRateBps) / 10_000);
  return Math.max(0, Math.min(fee, total));
}

/**
 * May a charge be routed to this store's connected account?
 *
 * charges_enabled is Stripe's answer, mirrored from account.updated, and it is
 * the only acceptable source. "We created an account" is not the same fact:
 * Stripe enables charges only once identity and bank details clear, which
 * takes days, and it revokes them again when a document expires.
 */
export function canChargeThroughConnect(
  payouts: StorePayouts | null | undefined,
): payouts is StorePayouts & { stripe_account_id: string } {
  return Boolean(
    payouts &&
      payouts.stripe_account_id &&
      payouts.charges_enabled &&
      isValidCommissionBps(payouts.commission_rate_bps),
  );
}

export type ConnectStatus =
  /** No account has ever been created for this store. */
  | "none"
  /** Account created, onboarding not finished. Stripe will not take charges. */
  | "onboarding"
  /** Onboarded enough to charge, but Stripe is not paying out yet. */
  | "charges_only"
  /** Charges and payouts both live. */
  | "ready";

/**
 * What to tell the seller. `charges_only` is a real and common state, not an
 * edge case: Stripe frequently enables charges before it releases the first
 * payout while it finishes verification, and a console that showed only
 * "ready or not" would tell a seller their store cannot open when it can.
 */
export function connectStatus(
  payouts: StorePayouts | null | undefined,
): ConnectStatus {
  if (!payouts?.stripe_account_id) return "none";
  if (!payouts.charges_enabled) return "onboarding";
  if (!payouts.payouts_enabled) return "charges_only";
  return "ready";
}

/**
 * May this store be made live?
 *
 * A store whose seller cannot be paid must not be public. The whole failure
 * this prevents is a buyer paying for an independent seller's goods into
 * Purify's balance with no mechanism to forward it, which is the position the
 * shop is in TODAY for any store other than a Purify-operated one.
 *
 * A Purify-operated store has no payouts row at all and is exempt: its money
 * is already in the right account. `purifyOperated` is passed in rather than
 * inferred from the absent row, because "no row" and "deliberately ours" must
 * not be the same test. Inferring it would make every un-onboarded third party
 * look like a Purify store and re-open the exact hole this closes.
 */
export function canGoLive(input: {
  purifyOperated: boolean;
  payouts: StorePayouts | null | undefined;
}): { ok: true } | { ok: false; reason: string } {
  if (input.purifyOperated) return { ok: true };
  const status = connectStatus(input.payouts);
  if (status === "none") {
    return {
      ok: false,
      reason:
        "This store has no Stripe account yet, so a buyer's money would have nowhere to go. The seller needs to finish payout setup first.",
    };
  }
  if (status === "onboarding") {
    return {
      ok: false,
      reason:
        "Stripe has not enabled charges for this store yet. It usually finishes within a day or two of the seller submitting their details.",
    };
  }
  if (!isValidCommissionBps(input.payouts?.commission_rate_bps ?? 0)) {
    return {
      ok: false,
      reason: `This store's commission is outside the allowed range (${COMMISSION_FLOOR_BPS / 100}% to ${COMMISSION_CEILING_BPS / 100}%). Set it before opening the store.`,
    };
  }
  return { ok: true };
}

/**
 * The extra arguments stripe.refunds.create needs for a Connect charge, and
 * an empty object for a charge that never had a destination.
 *
 * BOTH FLAGS MATTER AND THEY ARE DIFFERENT DECISIONS.
 *
 * reverse_transfer pulls the money back out of the seller's balance. Without
 * it a refund on a destination charge comes out of the PLATFORM's balance
 * while the seller keeps the sale proceeds, which is the opposite of the
 * owner's decision that sellers absorb refunds.
 *
 * refund_application_fee returns Purify's commission to the seller in
 * proportion to the amount refunded. It is true because the alternative is
 * that a fully refunded sale leaves the seller out of pocket by the
 * commission on a sale that unwound: they hand back 100% and Purify keeps 10%
 * of it. The drafted seller agreement says the deduction includes "any
 * commission already retained", which is this.
 *
 * Passing either flag on a charge with no transfer is an error from Stripe,
 * not a no-op, so the absence of a connected account has to be a branch rather
 * than a default.
 */
export function refundConnectOptions(connectedAccountId: string | null): {
  reverse_transfer?: true;
  refund_application_fee?: true;
} {
  if (!connectedAccountId) return {};
  return { reverse_transfer: true, refund_application_fee: true };
}

/**
 * What the seller actually keeps on one order, given the fee that was frozen
 * at charge time.
 *
 * Null fee means the order predates Connect or was charged with no connected
 * account. That is NOT zero: zero would assert the seller kept everything,
 * when in fact the money is sitting in Purify's balance awaiting a manual
 * transfer. Callers have to render the difference.
 */
export function sellerNetCents(
  orderTotalCents: number,
  applicationFeeCents: number | null,
): number | null {
  if (applicationFeeCents == null) return null;
  return Math.max(0, orderTotalCents - applicationFeeCents);
}
