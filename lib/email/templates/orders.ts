import type { TrackingLink } from "@/lib/shop/trackingLink";

import { buildEmail, type EmailContent } from "./build";

/**
 * Shop order email that follows a purchase: Phase 0 of the funnel.
 *
 * Transactional, about an order the reader placed, so no consent and no
 * unsubscribe. The confirmation itself predates this file and lives in
 * lib/shop/orderEmails.ts; these are the two that were missing.
 *
 * The order number is the EIK- reference from lib/shop/orderNumber.ts, the one
 * already printed on the buyer's receipt, so the two emails obviously belong to
 * the same order.
 */

const ORDER_FOOTER =
  "You are getting this because you placed an order with the Purify shop. Reply to this email and it reaches a person.";

const build = (opts: Omit<Parameters<typeof buildEmail>[0], "footer">): EmailContent =>
  buildEmail({ ...opts, footer: ORDER_FOOTER, eyebrow: "Purify Shop" });

/** Sent when tracking is added to a paid order. A corrected number sends again. */
export function orderShippedEmail(opts: {
  orderNumber: string;
  tracking: string;
  link: TrackingLink | null;
}): EmailContent {
  return build({
    subject: `Your order ${opts.orderNumber} is on its way`,
    heading: "On its way",
    paragraphs: [
      `Your order ${opts.orderNumber} has left us.`,
      opts.link?.carrier
        ? `It is travelling with ${opts.link.carrier}, and you can follow it with the tracking number below.`
        : "You can follow it with the tracking number below.",
    ],
    highlight: { label: "Tracking number", value: opts.tracking },
    action: opts.link ? { label: "Track your parcel", href: opts.link.url } : undefined,
  });
}

/**
 * A piece the reader asked about is back. They asked, about this one item, so
 * it is not the shop list and needs no list consent; it is sent once and the
 * alert is done, which the email says so they know nothing else follows.
 */
export function backInStockEmail(opts: { title: string; href: string }): EmailContent {
  return buildEmail({
    subject: `${opts.title} is back in the Purify shop`,
    heading: "It is back",
    paragraphs: [
      `You asked us to tell you when ${opts.title} was back. It is in the shop now.`,
      "This is the only email about it. If it sells out again, you can ask again from its page.",
    ],
    action: { label: "See it in the shop", href: opts.href },
    footer: "You are getting this because you asked to be told when this piece was back. Reply to this email and it reaches a person.",
    eyebrow: "Purify Shop",
  });
}

/**
 * The care guide, once, some days after an order is delivered. It sells
 * nothing, which is why the board calls it the highest-trust email in the
 * sequence: it is about looking after what the reader already has.
 */
export function careGuideEmail(opts: { orderNumber: string }): EmailContent {
  return build({
    subject: "Caring for your icon and prayer rope",
    heading: "Looking after it",
    paragraphs: [
      `Your order ${opts.orderNumber} should be with you now. A few things keep it well for years.`,
      "An icon: keep it out of direct sunlight and away from damp, such as a bathroom wall. Dust it with a soft, dry cloth, and never put water or a cleaner on its face.",
      "A prayer rope: a wool rope can be washed by hand in cool water and dried flat, away from heat. Knots loosen with use, which is how a rope wears in.",
      "If anything arrived damaged or not as it should be, reply to this email.",
    ],
  });
}

/**
 * The address prompt the owner asked for, as a safety net.
 *
 * Checkout makes Stripe collect an address, and every paid order checked on
 * 2026-09-14 had one, so this should almost never send. It exists for the order
 * where that failed anyway, which otherwise sits paid and unshippable with
 * nobody told. The reply goes straight to the shop inbox, which is less clever
 * than a form and cannot break.
 */
export function orderAddressEmail(opts: { orderNumber: string; reminder: boolean }): EmailContent {
  return build({
    subject: opts.reminder
      ? `Where should order ${opts.orderNumber} go?`
      : `Your order ${opts.orderNumber} is ready to ship`,
    heading: opts.reminder ? "Where should it go?" : "Ready to ship",
    paragraphs: [
      opts.reminder
        ? `We still do not have an address for your order ${opts.orderNumber}, so it is waiting here.`
        : `Your order ${opts.orderNumber} is ready to ship, and we do not have an address to send it to.`,
      "Reply to this email with the name and address it should go to, and it will be on its way.",
    ],
  });
}
