// Stripe-webhook settlement logic, extracted from the route so the money
// rules are unit-testable with an injected database (audit findings F-01 and
// F-03). Deliberately imports nothing server-only: the route hands in the
// admin client and the email sender.
//
// Invariants enforced here:
//  1. AMOUNT VERIFICATION (F-03): an order is only marked paid when Stripe's
//     amount_total and currency equal the order's own totals. The session is
//     created server-side from database prices, so a mismatch means
//     something is deeply wrong; we refuse to mark paid and log loudly
//     rather than trust the event.
//  2. PAYMENT WINS OVER CANCELLATION (F-01): checkout-cancel expires the
//     Stripe session before cancelling the order, but if that expire call
//     failed, a buyer can complete payment on an order already marked
//     cancelled. When a completed session arrives for a cancelled order,
//     the money moved, so the order is recovered to paid (guarded update)
//     and the normal one-time effects run.
//  3. IDEMPOTENCY: every status transition is a guarded UPDATE (.eq on the
//     prior status), so concurrent or retried deliveries fire the paid
//     effects (units-sold bump, confirmation email) exactly once.
//  4. PAYMENT INSTANT (F-33): the update that marks an order paid writes
//     paid_at in the same object literal as the payment intent, from a time
//     Stripe gave. Every caller has to hand one in, and null is the only way
//     to say there is none. The webhook passes event.created. The two callers
//     that read a session back instead of being sent an event (reconcile, the
//     abandoned sweep) pass the charge's time, chargeTimeOf below. Never this
//     server's clock, and never the session's own `created`: that is when
//     checkout STARTED, the untruth the column exists to replace.

export type SessionLike = {
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
  amount_total?: number | null;
  currency?: string | null;
  customer_details?: { email?: string | null } | null;
  collected_information?: { shipping_details?: unknown } | null;
  payment_intent?: string | { id: string } | null;
};

export type OrderTotals = { total_cents: number; currency: string };

/** A settlement outcome; the route maps update-failed to 500 (Stripe
 *  retries) and everything else to 200. */
export type SettleResult =
  | "paid"
  | "recovered"
  | "retry-noop"
  | "amount-mismatch"
  | "order-missing"
  | "ignored-status"
  | "update-failed";

// The narrow slice of the Supabase admin client the settlement uses. The
// real client satisfies this structurally; tests inject a fake.
type Row = Record<string, unknown>;
type MaybeSingle = Promise<{ data: Row | null; error: { message: string } | null }>;
export interface SettlementDb {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: unknown): {
        maybeSingle(): MaybeSingle;
      } & PromiseLike<{ data: Row[] | null; error: { message: string } | null }>;
    };
    update(values: Row): {
      eq(
        col: string,
        val: unknown,
      ): {
        eq(
          col: string,
          val: unknown,
        ): { select(cols: string): { maybeSingle(): MaybeSingle } };
      };
    };
  };
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ error: { message: string; code?: string } | null }>;
}

/**
 * Bump units_sold and take the stock down, with a fallback.
 *
 * shop_apply_paid_inventory supersedes shop_increment_units_sold: the old
 * function bumped a counter and left quantity_available alone, which is why a
 * ready-to-ship listing with one item in stock could be sold an unbounded
 * number of times.
 *
 * THE FALLBACK IS NOT DEFENSIVENESS, IT IS ORDERING. AGENTS.md records that
 * merged and applied are independently true or false, and migrations have sat
 * on main for over a week unapplied. Calling only the new function during that
 * window would stop units_sold working as well, trading one silent bug for
 * two. So an "undefined function" answer falls through to the old one, and
 * anything else is logged and swallowed.
 *
 * 42883 is Postgres undefined_function; PGRST202 is PostgREST failing to find
 * it in the schema cache, which is what actually comes back through supabase-js
 * and is the more likely of the two. Both mean the same thing here.
 */
const NO_SUCH_FUNCTION = new Set(["42883", "PGRST202"]);

async function applyPaidInventory(db: SettlementDb, orderId: string): Promise<void> {
  const { error } = await db.rpc("shop_apply_paid_inventory", {
    p_order_id: orderId,
  });
  if (!error) return;

  if (!NO_SUCH_FUNCTION.has(error.code ?? "") && !/could not find|does not exist/i.test(error.message)) {
    console.warn("[shop] paid inventory apply failed", error.message);
    return;
  }
  console.warn(
    "[shop] shop_apply_paid_inventory is absent; stock will NOT be decremented. Apply supabase/migrations/20260824000200_shop_inventory_on_sale.sql.",
  );
  const { error: legacyErr } = await db.rpc("shop_increment_units_sold", {
    p_order_id: orderId,
  });
  if (legacyErr) {
    console.warn("[shop] units_sold increment failed", legacyErr.message);
  }
}

export type ConfirmationSender = (order: {
  id: string;
  email: string | null;
  total_cents: number;
  currency: string;
  items: { title: string; quantity: number; unit_price_cents: number }[];
}) => Promise<unknown>;

/**
 * F-03 guard: Stripe's charged total must equal the order's own total.
 * Fails closed: a missing amount or currency is a mismatch.
 */
export function amountsMatch(order: OrderTotals, session: SessionLike): boolean {
  if (session.amount_total == null || !session.currency) return false;
  return (
    session.amount_total === order.total_cents &&
    session.currency.toLowerCase() === order.currency.toLowerCase()
  );
}

/**
 * Where a paid order enters fulfillment, as checkout recorded it on the
 * session's metadata.
 *
 * AN UNPAID CHECKOUT IS NOT AN ORDER TO SOURCE. Checkout used to create the
 * row already at `supplier_order_needed` for any special-order line, so an
 * abandoned checkout sat in the sourcing stage with nobody having paid: on
 * 2026-09-19 eight of the 38 abandoned checkouts in production read "awaiting
 * sourcing". Checkout now creates every row at `pending` and names the stage
 * here, and settlement moves the order into it at the moment money arrives.
 *
 * Only these two values are accepted, so metadata can never walk an order
 * into a later stage it has not reached. A session from before this change
 * has no key, and its order keeps the stage it was created with.
 */
export const FULFILLMENT_ON_PAID_KEY = "fulfillment_on_paid";
const STAGES_ON_PAID = new Set(["pending", "supplier_order_needed"]);

export function fulfillmentOnPaid(session: SessionLike): string | null {
  const v = session.metadata?.[FULFILLMENT_ON_PAID_KEY];
  return typeof v === "string" && STAGES_ON_PAID.has(v) ? v : null;
}

export function orderIdOf(session: SessionLike): string | null {
  return session.client_reference_id ?? session.metadata?.order_id ?? null;
}

function paymentIntentOf(session: SessionLike): string | null {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
}

/**
 * Stripe's time for a payment, as the timestamptz paid_at takes.
 *
 * Stripe counts in whole SECONDS since the epoch (event.created,
 * charge.created). Undefined means there is no usable instant, and paid_at is
 * then left out of the write rather than guessed. The order is still marked
 * paid: 20260822000300_shop_orders_paid_at.sql is explicit that nothing may
 * refuse a write that records money arriving, and as explicit that the column
 * is never filled from created_at or from a clock that was not there when the
 * money moved.
 *
 * The upper bound is the year 5138 in seconds and 1973 in milliseconds.
 * Date.now() handed over by mistake is past it, and would otherwise date the
 * sale some 56,000 years out. Postgres refuses that string ("time zone
 * displacement out of range"), so the update would fail on every retry and a
 * buyer who had paid would sit at pending.
 */
export function paidAtOf(seconds: number | null | undefined): string | undefined {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return undefined;
  if (seconds <= 0 || seconds >= 1e11) return undefined;
  return new Date(seconds * 1000).toISOString();
}

/** The one Stripe call chargeTimeOf makes. The real client satisfies it. */
export interface ChargeReader {
  paymentIntents: {
    retrieve(
      id: string,
      params: { expand: string[] },
    ): Promise<{ latest_charge?: string | { created?: number | null } | null }>;
  };
}

/**
 * Stripe's time for the payment behind a session that was READ BACK rather
 * than delivered. Reconcile and the abandoned sweep hold a retrieved session
 * and no event, so they have no event.created to hand to the settlement.
 *
 * It is the charge's own `created`, in seconds. For a card that is the moment
 * the webhook would have reported, give or take a second; for a payment
 * method that clears days later it is when the debit was started. Not the
 * session's `created` (checkout start), and not the time of the reconcile,
 * which can be days after the money moved.
 *
 * A SEPARATE CALL, AND IT CANNOT FAIL THE SETTLEMENT. These two callers are
 * the backstop for a webhook that never arrived. Expanding the charge on the
 * session read itself would make that read depend on the key being allowed to
 * see charges, and a refusal would stop the backstop reading sessions at all.
 * So the session is read as it always was, the charge is asked for here, and
 * any failure is null: the order is still settled, and paid_at waits for a
 * person to fill it in from Stripe.
 */
export async function chargeTimeOf(
  stripe: ChargeReader,
  session: SessionLike,
): Promise<number | null> {
  const intent = paymentIntentOf(session);
  if (!intent) return null;
  try {
    const { latest_charge: charge } = await stripe.paymentIntents.retrieve(intent, {
      expand: ["latest_charge"],
    });
    return charge && typeof charge !== "string" && typeof charge.created === "number"
      ? charge.created
      : null;
  } catch (e) {
    console.warn("[shop] could not read the charge time", intent, (e as Error).message);
    return null;
  }
}

function paidValues(session: SessionLike, paidAt: string | undefined): Row {
  return {
    payment_status: "paid",
    email: session.customer_details?.email ?? undefined,
    shipping_address: session.collected_information?.shipping_details ?? null,
    // Recorded so a refund can be issued later without a second
    // round-trip to Stripe to rediscover what was charged.
    stripe_payment_intent: paymentIntentOf(session),
    // When Stripe says the money landed (F-33). In this literal, beside the
    // payment intent, so no settlement can write one without the other. Left
    // out, never nulled, when no instant came: an instant already on the row
    // is a measurement, and a missing one must not erase it.
    ...(paidAt ? { paid_at: paidAt } : {}),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Settle a completed Checkout Session against its order. Runs the one-time
 * paid effects (units-sold bump, confirmation email) only when a guarded
 * update actually transitioned the row.
 *
 * `paidAtSeconds` is Stripe's time for the payment, in seconds since the
 * epoch: event.created from the webhook, chargeTimeOf() from a caller that
 * read the session back. Required, so a new caller cannot forget it; null
 * says Stripe gave none.
 */
export async function settleCheckoutSession(
  db: SettlementDb,
  sendConfirmation: ConfirmationSender,
  session: SessionLike,
  paidAtSeconds: number | null,
): Promise<SettleResult> {
  const orderId = orderIdOf(session);
  if (!orderId) return "order-missing";

  const { data: order } = await db
    .from("shop_orders")
    .select("id, payment_status, total_cents, currency")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    console.warn("[shop] webhook: completed session for unknown order", orderId);
    return "order-missing";
  }

  const status = order.payment_status as string;
  if (status === "paid") return "retry-noop";
  if (status !== "pending" && status !== "cancelled") {
    console.warn(
      `[shop] webhook: completed session for order in status '${status}'`,
      orderId,
    );
    return "ignored-status";
  }

  if (
    !amountsMatch(
      { total_cents: order.total_cents as number, currency: order.currency as string },
      session,
    )
  ) {
    console.error(
      `[shop] WEBHOOK AMOUNT MISMATCH order=${orderId} expected=${order.total_cents} ${order.currency} got=${session.amount_total} ${session.currency}. NOT marking paid; needs admin review.`,
    );
    return "amount-mismatch";
  }

  // Guarded transition from the observed prior status; a concurrent retry
  // loses the race, matches zero rows, and skips the one-time effects.
  const onPaid = fulfillmentOnPaid(session);
  const paidAt = paidAtOf(paidAtSeconds);
  const { data: updated, error } = await db
    .from("shop_orders")
    .update({
      ...paidValues(session, paidAt),
      // F-01 RESIDUAL, and it left a charged order nobody could work.
      //
      // All three cancel writers set BOTH status columns, while paidValues
      // sets neither fulfillment column. So the recovery path landed on
      // payment_status='paid' with fulfillment_status still 'cancelled', and
      // SELLER_TRANSITIONS.cancelled is [] (lib/shop/sellerOrders.ts), a
      // terminal state that offers nothing. The seller was shown a paid order
      // with no action available on it, and the buyer had been charged.
      //
      // Only on the recovery branch: an ordinary pending -> paid settlement
      // must not touch fulfillment at all, EXCEPT to enter the stage checkout
      // named on the session (fulfillmentOnPaid above). A recovered order
      // enters that stage too when the session names one.
      ...(onPaid
        ? { fulfillment_status: onPaid }
        : status === "cancelled"
          ? { fulfillment_status: "pending" }
          : {}),
    })
    .eq("id", orderId)
    .eq("payment_status", status)
    .select("id, email, total_cents, currency")
    .maybeSingle();
  if (error) {
    console.warn("[shop] webhook order update failed", error.message);
    return "update-failed";
  }
  if (!updated) return "retry-noop";

  if (status === "cancelled") {
    console.error(
      `[shop] webhook: PAYMENT COMPLETED AFTER CANCELLATION for order=${orderId}; payment wins, order recovered to paid. Review the cancel flow logs.`,
    );
  }
  if (!paidAt) {
    // Said only for the settlement that actually took the row, so a retry of
    // an order already paid does not raise it again.
    console.error(
      `[shop] SETTLED WITHOUT A PAYMENT TIME order=${orderId} got=${String(paidAtSeconds)}. The order is paid and paid_at is unwritten; fill it in from Stripe.`,
    );
  }

  // One-time paid effects. None of them may fail the webhook: Stripe would
  // retry a delivered order.
  await applyPaidInventory(db, updated.id as string);

  const { data: items } = await db
    .from("shop_order_items")
    .select("title, quantity, unit_price_cents")
    .eq("order_id", updated.id as string);
  await sendConfirmation({
    id: updated.id as string,
    email: (updated.email as string | null) ?? null,
    total_cents: updated.total_cents as number,
    currency: updated.currency as string,
    items: (items ?? []) as { title: string; quantity: number; unit_price_cents: number }[],
  }).catch((e) =>
    console.warn("[shop] confirmation email failed", (e as Error).message),
  );

  return status === "cancelled" ? "recovered" : "paid";
}
