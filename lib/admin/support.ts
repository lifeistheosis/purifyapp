/**
 * The support console's reasoning: the owner's pick A for Messages (r3-16,
 * 2026-10-30, "do A for messages"), the reader beside the request, with the
 * console from his note 28 ("an easy support console": a parcel's tracking,
 * a refund, or making it up to them, answered in a few taps).
 *
 * Here: where a request stands, what it is about, which of the reader's
 * orders it asks after, who can refund a plan bought in a store, and the
 * replies the console drafts from an order. Every draft is a draft: the
 * owner reads it, can change it, and presses Send himself.
 *
 * His four open questions on the sheet are taken as drawn until he says
 * (the brief of 2026-10-30): the 3 months of Plus as a switch that starts ON
 * on a refund and a reship; refund or reship chosen by him in the console,
 * never by the reader; our own steps and the carrier's link only, no
 * tracking service; and no Help screen in the apps.
 *
 * Pure. Dates are formatted in the zone handed in (the admin's own by
 * default, UTC in the tests).
 */

import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { trackingLink } from "@/lib/shop/trackingLink";
import type { BuyerOrderStatus } from "@/lib/shop/status";
import type { TicketStatus } from "@/lib/support/ticketNumber";

/** Where a request stands: on him, on the reader, or done. */
export type RequestState = "you" | "them" | "done";

export function requestState(status: TicketStatus): RequestState {
  if (status === "open") return "you";
  if (status === "pending") return "them";
  return "done";
}

/** The ticket status each of the three states writes. */
export const STATE_STATUS: Record<RequestState, TicketStatus> = {
  you: "open",
  them: "pending",
  done: "resolved",
};

export const STATE_WORD: Record<RequestState, string> = {
  you: "Waiting on you",
  them: "Waiting on them",
  done: "Done",
};

export type Inbox = "waiting" | "them" | "done";

/**
 * Which requests a view lists. Waiting is everything not done, the ones on
 * him first and the answered ones under them, as the sheet draws it; On them
 * is the answered ones alone; Done is the rest.
 */
export function inInbox(status: TicketStatus, inbox: Inbox): boolean {
  const s = requestState(status);
  if (inbox === "done") return s === "done";
  if (inbox === "them") return s === "them";
  return s !== "done";
}

/** The first order number a message carries, as EIK-XXXXXXXX. */
export function orderNumberIn(text: string): string | null {
  const m = /\bEIK-?([0-9A-F]{8})\b/i.exec(text);
  return m ? `EIK-${m[1].toUpperCase()}` : null;
}

const ORDER_WORDS = /\b(order|orders|parcel|package|tracking|track|shipped|shipping|delivery|delivered|arrived|arrive|bent|broken|damaged|lost|address|reship|icon|cross|rope)\b/i;
const PLUS_WORDS = /\b(plus|pro|subscription|subscribed|charged|charge|billing|billed|renew|renewal|renewed|trial|app store|google play)\b/i;

/** A word for the row: what the request is about, or null when it is neither. */
export function requestKind(input: { orderId: string | null; subject: string; body: string }): "Order" | "Plus" | null {
  const text = `${input.subject}\n${input.body}`;
  if (input.orderId || orderNumberIn(text)) return "Order";
  if (PLUS_WORDS.test(text)) return "Plus";
  if (ORDER_WORDS.test(text)) return "Order";
  return null;
}

export type AskedAbout = { orderId: string; how: "ticket" | "number" | "latest" };

/**
 * The order a request is about. The one the form attached, else the one whose
 * number the reader typed, else their latest, which the page labels as only
 * that ("their last order"), never as matched.
 */
export function askedAbout(
  ticket: { order_id: string | null; texts: readonly string[] },
  orders: readonly { id: string; created_at: string }[],
): AskedAbout | null {
  if (ticket.order_id && orders.some((o) => o.id === ticket.order_id)) {
    return { orderId: ticket.order_id, how: "ticket" };
  }
  for (const t of ticket.texts) {
    const n = orderNumberIn(t);
    const hit = n ? orders.find((o) => orderConfirmationNumber(o.id) === n) : null;
    if (hit) return { orderId: hit.id, how: "number" };
  }
  const latest = [...orders].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  return latest ? { orderId: latest.id, how: "latest" } : null;
}

/** Where a plan was bought, from entitlements.plus_source. */
export function storeName(source: string | null | undefined): string | null {
  switch (source) {
    case "apple":
      return "App Store";
    case "google":
      return "Google Play";
    case "stripe":
      return "the website";
    case "gift":
      return "a gift";
    case "comp":
      return "granted by you";
    case "legacy":
      return "from the launch";
    default:
      return null;
  }
}

export type StoreRule = {
  /** Who can return the money: never us for a store purchase. */
  who: "apple" | "google" | "stripe" | "nobody" | "unknown";
  title: string;
  body: string;
  /** Their page, offered in the reply. */
  page: { label: string; url: string } | null;
  /** The line put into the reply when he chooses to send their page. */
  replyLine: string | null;
};

/**
 * Who refunds a plan. A plan bought in the App Store or on Google Play is
 * refunded by Apple or Google, never by Purify, which never sees the card:
 * the console says so and offers their page and a gift instead. A plan
 * billed on the website goes back through Stripe's own dashboard, because
 * the console's one money path is the shop's (lib/shop/refundExecution.ts)
 * and a subscription is not a shop order.
 */
export function storeRefundRule(source: string | null | undefined): StoreRule {
  switch (source) {
    case "apple":
      return {
        who: "apple",
        title: "Only Apple can refund this",
        body: "Plus was bought in the App Store, so the money is Apple's to return. Purify never sees the card.",
        page: { label: "Apple's refund page", url: "https://reportaproblem.apple.com" },
        replyLine:
          "purchases made in the App Store are refunded by Apple, not by us. You can ask for it here, choosing the Purify charge and then Request a refund: https://reportaproblem.apple.com",
      };
    case "google":
      return {
        who: "google",
        title: "Only Google can refund this",
        body: "Plus was bought on Google Play, so Google returns the money. Purify never sees the card. RevenueCat's own dashboard can ask Google too; this console moves no Plus money.",
        page: { label: "Google Play's refund page", url: "https://support.google.com/googleplay/answer/2479637" },
        replyLine:
          "purchases made on Google Play are refunded by Google, not by us. You can ask for it here: https://support.google.com/googleplay/answer/2479637",
      };
    case "stripe":
      return {
        who: "stripe",
        title: "Refund it in Stripe",
        body: "Plus was bought on the website and is billed through Stripe. Its refund is made in Stripe's dashboard; this console moves no Plus money.",
        page: { label: "Stripe's subscriptions", url: "https://dashboard.stripe.com/subscriptions" },
        replyLine: null,
      };
    case "gift":
    case "comp":
    case "legacy":
      return {
        who: "nobody",
        title: "Nobody paid for this Plus",
        body:
          source === "gift"
            ? "Their Plus is a gift they opened, so there is no charge to return."
            : source === "comp"
              ? "Their Plus was granted from the admin, so there is no charge to return."
              : "Their Plus came with the launch, so there is no charge to return.",
        page: null,
        replyLine: null,
      };
    default:
      return {
        who: "unknown",
        title: "Where it was bought is not on file",
        body: "No plan source is recorded for this account, so the console cannot say who refunds it.",
        page: null,
        replyLine: null,
      };
  }
}

/** The four lengths a gift is given in, as the Gifts route counts them. */
export const GIFT_LENGTHS: readonly (readonly [number, string])[] = [
  [30, "1 month"],
  [90, "3 months"],
  [180, "6 months"],
  [365, "1 year"],
];

/** His rule as drawn: a thank you of 3 months on a refund or a reship. */
export const THANK_YOU_DAYS = 90;

export function lengthWord(days: number): string {
  return GIFT_LENGTHS.find(([d]) => d === days)?.[1] ?? `${days} days`;
}

const SIGN_OFF = "Edgar, the Purify Team";

/** "Hi A.," from "A. Sample"; "Hi there," when no name is on file. */
export function greeting(name: string | null | undefined): string {
  const first = name?.trim().split(/\s+/)[0];
  return first ? `Hi ${first},` : "Hi there,";
}

function day(iso: string | null, timeZone?: string): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone });
}

export type TrackingFacts = {
  name: string | null;
  /** The first piece's title, or null for an order of several. */
  piece: string | null;
  word: BuyerOrderStatus;
  step: number;
  of: number;
  /** When it reached the step it is on. */
  at: string | null;
  tracking: string | null;
};

/**
 * The reply the console writes from the order, for him to read and send.
 * Our own steps and the carrier's link, and nothing a tracking service would
 * know: a scan date is not ours to state.
 */
export function draftTrackingReply(f: TrackingFacts, timeZone?: string): string {
  const what = f.piece ? `your ${f.piece}` : "your order";
  const link = f.tracking ? trackingLink(f.tracking) : null;
  const when = day(f.at, timeZone);
  // Every body runs on from the greeting, so it starts in lower case.
  let body: string;
  if (f.word === "Shipped") {
    const carrier = link?.carrier ? ` with ${link.carrier}` : "";
    body =
      `${what} left us${when ? ` on ${when}` : ""}${carrier} and is on its way: step ${f.step} of ${f.of}. ` +
      "Parcels can sit a few days between scans." +
      (link ? ` Follow it here: ${link.url}` : "") +
      (link ? "\n\nIf it has not moved in three days, write back and we will make it right." : " If it has not moved in three days, write back and we will make it right.");
  } else if (f.word === "Delivered") {
    body =
      `the tracking shows ${what} was delivered${when ? ` on ${when}` : ""}. ` +
      "If it has not reached you, write back and we will make it right.";
  } else if (f.word === "Refunded") {
    body = "this order was refunded. The money goes back to the card you paid with, and most banks show it within five to ten business days.";
  } else if (f.word === "Cancelled" || f.word === "Awaiting Payment") {
    body = "this order was never paid, so nothing is on its way and nothing was charged.";
  } else {
    body =
      `${what} is with us and has not left yet: ${f.word.toLowerCase()}, step ${f.step} of ${f.of}. ` +
      "We send the tracking the day it ships.";
  }
  return `${greeting(f.name)} ${body}\n\n${SIGN_OFF}`;
}

/** The reply after a refund through the console. */
export function draftRefundReply(name: string | null, amount: string, giftDays: number | null): string {
  const gift = giftDays
    ? ` We have also added ${lengthWord(giftDays)} of Purify Plus as a thank you for your patience: it opens the next time you open Purify.`
    : "";
  return `${greeting(name)} your refund of ${amount} is on its way back to the card you paid with. Most banks show it within five to ten business days.${gift}\n\n${SIGN_OFF}`;
}

/** The reply after a reship. */
export function draftReshipReply(name: string | null, piece: string | null, giftDays: number | null): string {
  const what = piece ? `another ${piece}` : "a new one";
  const gift = giftDays
    ? ` We have also added ${lengthWord(giftDays)} of Purify Plus for the trouble: it opens the next time you open Purify.`
    : "";
  return `${greeting(name)} we are sending ${what}, at no charge. You will have its tracking the day it ships.${gift}\n\n${SIGN_OFF}`;
}

/** The reply that hands a store purchase to the store. */
export function draftStoreReply(name: string | null, rule: StoreRule, giftDays: number | null): string | null {
  if (!rule.replyLine) return null;
  const gift = giftDays
    ? ` In the meantime we have added ${lengthWord(giftDays)} of Purify Plus to your account: it opens the next time you open Purify.`
    : "";
  return `${greeting(name)} ${rule.replyLine}${gift}\n\n${SIGN_OFF}`;
}

/** A line that runs on from a greeting, standing as a sentence of its own. */
export function asSentence(line: string): string {
  return line ? `${line[0].toUpperCase()}${line.slice(1)}` : line;
}

/** The line that goes with a gift, as drawn. */
export function giftLine(rule: StoreRule | null): string {
  if (rule && (rule.who === "apple" || rule.who === "google")) {
    return `A thank you for your patience while ${rule.who === "apple" ? "Apple" : "Google"} sorts out the charge.`;
  }
  return "A thank you for your patience.";
}

/** "a.sample@example.com · reader since March". */
export function readerSince(iso: string | null, now: Date, timeZone?: string): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  const sameYear =
    d.toLocaleDateString("en-US", { year: "numeric", timeZone }) ===
    now.toLocaleDateString("en-US", { year: "numeric", timeZone });
  return `reader since ${d.toLocaleDateString("en-US", sameYear ? { month: "long", timeZone } : { month: "long", year: "numeric", timeZone })}`;
}
