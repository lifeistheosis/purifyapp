/**
 * What the console's two money-and-parcel actions may do, decided before
 * anything is written. The routes (app/api/admin/shop/refunds/console and
 * app/api/admin/shop/orders/reship) ask these first.
 *
 * A REFUND moves money, so the console never builds a path of its own: the
 * route files a request and hands it to lib/shop/refundExecution.ts, the same
 * claim, spend and settle the Marketplace refunds use, with the request
 * claimed before Stripe is called and an idempotency key on the refund. These
 * rules are only what is refused before that: an unpaid or refunded order, a
 * refund already open on the order, and an amount above what was paid. The
 * page asks for the button to be held, and the route wants confirm: true as a
 * literal, so a stray request without it is refused.
 *
 * A RESHIP sends the same pieces again at no charge: the order starts over at
 * Needs sourcing, with its first parcel's tracking kept in the order's
 * history. Only an order that has left us can be reshipped: one still with us
 * is moved back with its own Back button instead.
 *
 * Pure.
 */

import { formatPrice } from "@/lib/shop/format";

export type Refusal = { status: 400 | 409; error: string };

export function consoleRefundRefusal(
  order: { payment_status: string; total_cents: number; currency?: string | null },
  activeRequest: string | null,
  amountCents: number | undefined,
): Refusal | null {
  if (order.payment_status === "refunded") {
    return { status: 409, error: "This order is already refunded." };
  }
  if (order.payment_status !== "paid") {
    return { status: 409, error: "This order was never paid, so there is nothing to refund." };
  }
  if (activeRequest === "requested" || activeRequest === "approved") {
    return {
      status: 409,
      error:
        "A refund for this order is already open. Decide it under Catalogue, Marketplace, Refunds, so it is never paid twice.",
    };
  }
  if (amountCents !== undefined) {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return { status: 400, error: "A refund has to be more than nothing." };
    }
    if (amountCents > order.total_cents) {
      return {
        status: 400,
        error: `A refund can be at most the ${formatPrice(order.total_cents, order.currency ?? "usd")} that was paid.`,
      };
    }
  }
  return null;
}

/** Stages a reship starts from: the parcel has left us. */
const LEFT_US = new Set(["shipped", "delivered"]);

export function reshipRefusal(order: { payment_status: string; fulfillment_status: string }): Refusal | null {
  if (order.payment_status !== "paid") {
    return {
      status: 409,
      error:
        order.payment_status === "refunded"
          ? "This order was refunded, so there is nothing to send again."
          : "This order was never paid.",
    };
  }
  if (!LEFT_US.has(order.fulfillment_status)) {
    return {
      status: 409,
      error: "This order has not left us yet. Move it back a stage instead of reshipping it.",
    };
  }
  return null;
}

/** The line a reship leaves in the order's history. */
export function reshipNote(reason: string, firstTracking: string | null): string {
  const why = reason.trim().replace(/\s+/g, " ");
  return `Reship at no charge: ${why}. First parcel: ${firstTracking?.trim() || "no tracking on file"}.`.slice(0, 500);
}
