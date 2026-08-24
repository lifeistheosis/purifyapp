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
    "[shop] shop_apply_paid_inventory is absent; stock will NOT be decremented. Apply supabase/migrations/20260824_shop_inventory_on_sale.sql.",
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

export function orderIdOf(session: SessionLike): string | null {
  return session.client_reference_id ?? session.metadata?.order_id ?? null;
}

function paidValues(session: SessionLike): Row {
  return {
    payment_status: "paid",
    email: session.customer_details?.email ?? undefined,
    shipping_address: session.collected_information?.shipping_details ?? null,
    // Recorded so a refund can be issued later without a second
    // round-trip to Stripe to rediscover what was charged.
    stripe_payment_intent:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Settle a completed Checkout Session against its order. Runs the one-time
 * paid effects (units-sold bump, confirmation email) only when a guarded
 * update actually transitioned the row.
 */
export async function settleCheckoutSession(
  db: SettlementDb,
  sendConfirmation: ConfirmationSender,
  session: SessionLike,
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
  const { data: updated, error } = await db
    .from("shop_orders")
    .update({
      ...paidValues(session),
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
      // must not touch fulfillment at all.
      ...(status === "cancelled" ? { fulfillment_status: "pending" } : {}),
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
