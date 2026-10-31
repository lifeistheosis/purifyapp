/**
 * An order as its whole story, from the reader's side: the owner's pick B
 * for the shop's Orders (r3-19, 2026-10-31, "B. A. A."), answering his own
 * Orders B in the admin (lib/admin/orderStory.ts, r3-16, 2026-10-30).
 *
 * The five steps are the reader's own words (lib/shop/status.ts): the same
 * words and the same marks the admin's order story shows him (readerSteps)
 * and the support console's tracking card carries in its email
 * (lib/support/trackingCard.ts), so the three can never disagree about where
 * an order is. lib/shop/__tests__/orderStory.test.ts holds them together.
 *
 * Done is solid, the step it is on is lit, what is ahead is hollow. A step is
 * dated only where the order's own row knows the day (no migration: the
 * owner's open question 1 on the sheet, taken as drawn): the first step by
 * when it was paid, and the step it is on by when the row last moved, which
 * is when the admin's funnel says its stage began (lib/shop/funnel.ts,
 * FunnelOrder.updated_at). The moves between are the admin's alone
 * (shop_order_events), so those steps stay undated.
 *
 * Pure: the clock is handed in.
 */

import { estimatedShipWindow, type DispatchWindow, type ShipEstimate } from "./eta";
import { isHiddenOrder, isUnfinishedCheckout } from "./orders";
import { BUYER_ORDER_STEPS, buyerOrderStatus, buyerStepIndex, type BuyerOrderStatus } from "./status";
import type { ShopFulfillmentStatus } from "./types";

export type MarkState = "done" | "now" | "todo";

/** What the story needs of an order row. */
export type StoryRow = {
  payment_status: "pending" | "paid" | "refunded" | "cancelled";
  fulfillment_status: ShopFulfillmentStatus;
  created_at: string;
  paid_at?: string | null;
  updated_at?: string | null;
};

export type StoryStep = {
  word: BuyerOrderStatus;
  state: MarkState;
  /** The day the step is dated by, or null where the row does not know it. */
  at: string | null;
  /** True when `at` is when the order came onto the step it is still on ("since Oct 29"). */
  since: boolean;
};

/**
 * The reader's five steps, marked and dated. An order off the ladder
 * (refunded, cancelled) has every step hollow, as the admin's readerSteps
 * draws it; offLadder() names the word it shows instead.
 */
export function storySteps(o: StoryRow): StoryStep[] {
  const word = buyerOrderStatus(o);
  const at = buyerStepIndex(word);
  return BUYER_ORDER_STEPS.map((w, i) => {
    const state: MarkState =
      at < 0 ? "todo" : i < at ? "done" : i === at ? (w === "Delivered" ? "done" : "now") : "todo";
    let day: string | null = null;
    let since = false;
    if (state !== "todo") {
      if (i === 0) day = o.paid_at ?? o.created_at;
      else if (i === at) {
        day = o.updated_at ?? null;
        since = w !== "Delivered";
      }
    }
    return { word: w, state, at: day, since };
  });
}

/** The word an order shows when it has left the road (Refunded, Cancelled), else null. */
export function offLadder(o: Pick<StoryRow, "payment_status" | "fulfillment_status">): BuyerOrderStatus | null {
  const word = buyerOrderStatus(o);
  return buyerStepIndex(word) < 0 ? word : null;
}

/**
 * The honest ship estimate while the order has not shipped: the slowest
 * piece's promised window from the day it was placed (lib/shop/eta.ts). Null
 * once it is with the carrier, or when no piece carries a window.
 */
export function storyEstimate(
  o: StoryRow & { items: { product: DispatchWindow | null }[] },
  now: Date,
): ShipEstimate | null {
  const step = buyerStepIndex(buyerOrderStatus(o));
  if (step < 0 || step >= buyerStepIndex("Shipped")) return null;
  return estimatedShipWindow(o.created_at, o.items.map((i) => i.product), now);
}

/**
 * What the lit step means, as a catalog key, where the drawing gives it one:
 * the packing slip's own line under Preparing Your Order, the step that takes
 * one to three weeks (the owner's open question 4, whether it is true of
 * every order, taken as drawn).
 */
export function stepMeaningKey(word: BuyerOrderStatus): string | null {
  return word === "Preparing Your Order" ? "shop.orderStepPreparingMeans" : null;
}

/**
 * The review is asked for once the order has arrived, never at paid: build
 * 85 asked "Enjoying your icon?" of a wall cross that had not shipped.
 */
export function asksForReview(
  o: Pick<StoryRow, "payment_status" | "fulfillment_status"> & { items: { product: { slug: string } | null }[] },
): boolean {
  return buyerOrderStatus(o) === "Delivered" && o.items.some((i) => Boolean(i.product?.slug));
}

export type OrderLine =
  | { kind: "item"; title: string; quantity: number; cents: number }
  | { kind: "shipping"; cents: number }
  | { kind: "tax"; cents: number }
  | { kind: "total"; cents: number };

/**
 * The money as the parcel's list writes it: each piece at what it cost (a
 * line's unit price is what was charged, discount or not, lib/shop/checkout.ts),
 * a shipping line always (build 85 totalled $24 and $14 to $42.99 with none),
 * tax only when there was any, and the total.
 */
export function orderLines(o: {
  items: { title: string; unit_price_cents: number; quantity: number }[];
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
}): OrderLine[] {
  const lines: OrderLine[] = o.items.map((i) => ({
    kind: "item",
    title: i.title,
    quantity: i.quantity,
    cents: i.unit_price_cents * i.quantity,
  }));
  lines.push({ kind: "shipping", cents: o.shipping_cents });
  if (o.tax_cents > 0) lines.push({ kind: "tax", cents: o.tax_cents });
  lines.push({ kind: "total", cents: o.total_cents });
  return lines;
}

/** The words the list is sorted under, in the order of the road, then the two off it. */
const GROUP_ORDER: BuyerOrderStatus[] = [...BUYER_ORDER_STEPS, "Refunded", "Cancelled"];

export type OrderGroup<T> =
  | { word: BuyerOrderStatus; mark: MarkState; orders: T[] }
  | { word: "notFinished"; mark: "dashed"; orders: T[] };

/**
 * Your orders under the reader's own words. An order still on the road is
 * lit, a delivered one solid, one that left the road hollow; a checkout left
 * before paying comes last under Not finished, dashed, and one that has gone
 * stale (or was cancelled unpaid) is not listed at all (lib/shop/orders.ts).
 * Newest first within a word.
 */
export function groupOrders<T extends StoryRow>(orders: readonly T[], now: number): OrderGroup<T>[] {
  const shown = orders.filter((o) => !isHiddenOrder(o, now));
  const newest = (a: T, b: T) => Date.parse(b.created_at) - Date.parse(a.created_at);
  const groups: OrderGroup<T>[] = [];
  for (const word of GROUP_ORDER) {
    const list = shown.filter((o) => !isUnfinishedCheckout(o) && buyerOrderStatus(o) === word).sort(newest);
    if (!list.length) continue;
    const mark: MarkState = word === "Delivered" ? "done" : buyerStepIndex(word) >= 0 ? "now" : "todo";
    groups.push({ word, mark, orders: list });
  }
  const unfinished = shown.filter(isUnfinishedCheckout).sort(newest);
  if (unfinished.length) groups.push({ word: "notFinished", mark: "dashed", orders: unfinished });
  return groups;
}

/** A product's picture for its order line: the primary one, else the first by order. */
export function piecePhoto(
  product: { media?: { media_url: string; alt_text: string; sort_order: number; is_primary: boolean }[] | null } | null,
): { src: string; alt: string } | null {
  const media = product?.media ?? [];
  if (!media.length) return null;
  const pick = media.find((m) => m.is_primary) ?? [...media].sort((a, b) => a.sort_order - b.sort_order)[0];
  return pick?.media_url ? { src: pick.media_url, alt: pick.alt_text ?? "" } : null;
}

/** The address as lines, for "Ship to". */
export function shipToLines(
  a: {
    name?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal_code?: string | null;
      country?: string | null;
    } | null;
  } | null,
): string[] {
  if (!a) return [];
  const ad = a.address ?? {};
  const place = [ad.city, [ad.state, ad.postal_code].filter(Boolean).join(" ")].filter((p) => p && p.trim()).join(", ");
  return [a.name, ad.line1, ad.line2, place, ad.country]
    .map((l) => (l ?? "").trim())
    .filter(Boolean);
}

/** The first piece's title, and how many more the order holds ("and 1 more"). */
export function orderTitle(items: readonly { title: string }[]): { first: string; more: number } {
  return { first: items[0]?.title ?? "", more: Math.max(0, items.length - 1) };
}

/** "9400 0000 0000 …": a tracking number in fours, as the carrier prints it. */
export function trackingInFours(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ");
}

/** The catalog key for each of the reader's words (lib/shop/status.ts keeps the English as the data). */
export const STATUS_KEY: Record<BuyerOrderStatus, string> = {
  "Awaiting Payment": "shop.orderStatusAwaitingPayment",
  "Order Confirmed": "shop.orderStatusOrderConfirmed",
  "Preparing Your Order": "shop.orderStatusPreparingYourOrder",
  "Ready to Ship": "shop.orderStatusReadyToShip",
  Shipped: "shop.orderStatusShipped",
  Delivered: "shop.orderStatusDelivered",
  Cancelled: "shop.orderStatusCancelled",
  Refunded: "shop.orderStatusRefunded",
};

/** Whether this order shipped from EIKON, whose own black box and seal it travels in. */
export function shipsInEikonBox(store: { slug?: string | null; public_name?: string | null } | null): boolean {
  if (!store) return false;
  return store.slug ? store.slug === "eikon" : store.public_name === "EIKON";
}
