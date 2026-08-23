// Guarded writes to shop_orders, judged by ROWS MATCHED.
//
// Audit F-01, the second direction. The settlement webhook writes
// payment_status and four non-status columns (lib/shop/webhookSettlement.ts)
// and never touches fulfillment_status, so a guard on fulfillment_status alone
// is blind to a payment landing: it matched happily and stamped "cancelled"
// over "paid".
//
// Every guarded write reads its matched rows back. PostgREST reports no error
// for an UPDATE that matched nothing, so `error === null` is not success, it is
// only "the database was reachable". The same rule applies to reads: a read
// that FAILED is not a row that is ABSENT, and this module never conflates the
// two, because flipOrderRefunded runs after money has already left Stripe and
// "the order is gone" is not a claim a failed read is entitled to make.
//
// Imports nothing server-only: the caller hands in the client, so this is unit
// testable with an injected database exactly like webhookSettlement.ts. That
// matters because vitest.config.ts collects lib/** only, so logic reachable
// only from app/api/** cannot be tested at all (audit F-09).

export type OrderStateSnapshot = {
  payment_status: string;
  fulfillment_status: string;
};

export type OrderStateRead =
  | { ok: true; state: OrderStateSnapshot | null } // null = genuinely absent
  | { ok: false; message: string }; // the read itself failed

export type GuardedOrderWrite =
  | { ok: true; row: OrderStateSnapshot & { id: string } }
  | { ok: false; reason: "stale"; found: OrderStateSnapshot | null }
  | { ok: false; reason: "error"; message: string };

type Row = Record<string, unknown>;
type ListResult = { data: Row[] | null; error: { message: string } | null };
type SingleResult = { data: Row | null; error: { message: string } | null };

interface SelectChain {
  eq(col: string, val: unknown): SelectChain;
  maybeSingle(): Promise<SingleResult>;
}
interface UpdateChain {
  eq(col: string, val: unknown): UpdateChain;
  select(cols: string): PromiseLike<ListResult>;
}

/** The narrow slice of the Supabase admin client these helpers need. */
export interface OrderWriteDb {
  from(table: string): {
    select(cols: string): SelectChain;
    update(values: Row): UpdateChain;
  };
}

function snapshot(row: Row): OrderStateSnapshot {
  return {
    payment_status: String(row.payment_status),
    fulfillment_status: String(row.fulfillment_status),
  };
}

export async function readOrderState(
  db: OrderWriteDb,
  orderId: string,
): Promise<OrderStateRead> {
  const { data, error } = await db
    .from("shop_orders")
    .select("payment_status, fulfillment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return { ok: false, message: error.message };
  return { ok: true, state: data ? snapshot(data) : null };
}

/**
 * Compare and swap. `expect` names the columns to guard on and the values they
 * must still hold; omit a column to leave it unguarded.
 *
 * A zero-row match re-reads the row so the caller can say what it FOUND rather
 * than only that it failed. If that re-read itself fails we report `error` and
 * never `stale` with `found: null`, because "the order is gone" is a claim a
 * broken read has not earned.
 */
export async function guardedOrderUpdate(
  db: OrderWriteDb,
  orderId: string,
  expect: Partial<OrderStateSnapshot>,
  values: Row,
): Promise<GuardedOrderWrite> {
  let q = db.from("shop_orders").update(values).eq("id", orderId);
  if (expect.payment_status !== undefined) {
    q = q.eq("payment_status", expect.payment_status);
  }
  if (expect.fulfillment_status !== undefined) {
    q = q.eq("fulfillment_status", expect.fulfillment_status);
  }
  const { data, error } = await q.select("id, payment_status, fulfillment_status");
  if (error) return { ok: false, reason: "error", message: error.message };
  if (!data || data.length === 0) {
    const re = await readOrderState(db, orderId);
    if (!re.ok) return { ok: false, reason: "error", message: re.message };
    return { ok: false, reason: "stale", found: re.state };
  }
  const row = data[0];
  return { ok: true, row: { id: String(row.id), ...snapshot(row) } };
}

export function staleOrderMessage(found: OrderStateSnapshot | null): string {
  if (!found) return "That order no longer exists. Reload and try again.";
  return `Nothing was changed. This order moved while you were looking at it: it now reads payment "${found.payment_status}", fulfillment "${found.fulfillment_status}". Reload and try again.`;
}

/**
 * Payment states a cancellation may be stamped over.
 *
 * An allow-list, not a deny-list. Money that moved (paid) or moved back
 * (refunded) never becomes "cancelled", and a payment_status added to the
 * schema later is refused by default rather than silently permitted. The
 * previous check tested only for "paid", so a REFUNDED order passed straight
 * through and its refund record was overwritten.
 */
export function canCancelPayment(paymentStatus: string): boolean {
  return paymentStatus === "pending" || paymentStatus === "cancelled";
}

export function cancelRefusalMessage(paymentStatus: string): string {
  if (paymentStatus === "paid") {
    return "This order is paid. Refund it instead of cancelling.";
  }
  if (paymentStatus === "refunded") {
    return "This order is refunded. It cannot be cancelled.";
  }
  return `This order reads payment "${paymentStatus}" and cannot be cancelled.`;
}

/** Payment states an order may be stamped refunded from. */
export function canFlipRefunded(paymentStatus: string): boolean {
  return paymentStatus === "paid" || paymentStatus === "refunded";
}
