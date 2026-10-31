/**
 * The card a reader gets in a support reply about their parcel (the support
 * console's "Send tracking", r3-16, 2026-10-30): their order's number, the
 * step it is on in their own five words, the day it got there, and the
 * carrier's link.
 *
 * Our own steps and the carrier's link only. Whether a scan moved yesterday
 * is a tracking service's to know, and the owner has not added one (his open
 * question 4), so the card never says it.
 *
 * Pure, so the console can show the same card it sends.
 */

import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { BUYER_ORDER_STEPS, buyerOrderStatus, buyerStepIndex } from "@/lib/shop/status";
import { trackingLink } from "@/lib/shop/trackingLink";
import type { ShopFulfillmentStatus } from "@/lib/shop/types";

export type TrackingCard = {
  number: string;
  /** Their word for where it is: "Shipped". */
  word: string;
  /** 1 to 5, or 0 off the ladder (refunded, cancelled). */
  step: number;
  of: number;
  /** When it reached that word, or null when that is not recorded. */
  at: string | null;
  carrier: string | null;
  url: string | null;
};

const STAGES: ShopFulfillmentStatus[] = [
  "pending",
  "supplier_order_needed",
  "supplier_order_placed",
  "inbound_to_eikon",
  "received_for_inspection",
  "packaged",
  "shipped",
  "delivered",
];

export function trackingCard(
  order: {
    id: string;
    payment_status: "pending" | "paid" | "refunded" | "cancelled";
    fulfillment_status: ShopFulfillmentStatus;
    outbound_tracking: string | null;
    paid_at?: string | null;
    created_at: string;
  },
  events: readonly { to_status: string; at: string }[],
): TrackingCard {
  const word = buyerOrderStatus(order);
  const step = buyerStepIndex(word) + 1;
  let at: string | null = null;
  if (word === "Order Confirmed") at = order.paid_at ?? order.created_at;
  else if (step > 0) {
    // The first move into any stage that reads as this word.
    for (const e of events) {
      const stage = e.to_status as ShopFulfillmentStatus;
      if (!STAGES.includes(stage)) continue;
      if (buyerOrderStatus({ payment_status: "paid", fulfillment_status: stage }) !== word) continue;
      if (!at || Date.parse(e.at) < Date.parse(at)) at = e.at;
    }
  }
  const link = order.outbound_tracking ? trackingLink(order.outbound_tracking) : null;
  return {
    number: orderConfirmationNumber(order.id),
    word,
    step,
    of: BUYER_ORDER_STEPS.length,
    at,
    carrier: link?.carrier ?? null,
    url: link?.url ?? null,
  };
}

/** "Shipped · Oct 24", in UTC, which is what the server sends from. */
export function cardHeadline(card: TrackingCard, timeZone = "UTC"): string {
  if (!card.at) return card.word;
  const day = new Date(card.at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone });
  return `${card.word} · ${day}`;
}
