import "server-only";

import { amountRow, bigValue, button, microLabel, note, p, table } from "@/lib/email/blocks";
import { emailLayout } from "@/lib/email/layout";
import { sendLoggedEmail } from "@/lib/email/ledger";
import { escapeHtml, type SendResult } from "@/lib/email/send";
import { SITE_URL } from "@/lib/site";
import { formatPrice } from "./format";
import { orderConfirmationNumber } from "./orderNumber";

type OrderItem = { title: string; quantity: number; unit_price_cents: number };

/**
 * Order confirmation email, sent from the Stripe webhook once an order is
 * paid. No-ops without a recipient or a configured email provider.
 */
export async function sendOrderConfirmationEmail(order: {
  id: string;
  email: string | null;
  total_cents: number;
  currency: string;
  items: OrderItem[];
}): Promise<SendResult> {
  if (!order.email) return { ok: false, skipped: true };
  const num = orderConfirmationNumber(order.id);
  // Shipping was hardcoded to "Free" beside a total that already included
  // flatShippingCents() for every non-Pro buyer, so the receipt contradicted
  // the charge. Derive it instead of re-deriving the perk: checkout writes
  // total_cents = itemsTotal + shipping with tax_cents 0
  // (lib/shop/checkout.ts:124-127), so the gap IS the shipping actually
  // charged, whatever rule produced it.
  const itemsTotal = order.items.reduce(
    (sum, i) => sum + i.unit_price_cents * i.quantity,
    0,
  );
  const shippingCents = Math.max(0, order.total_cents - itemsTotal);
  const shippingLabel =
    shippingCents === 0 ? "Free" : formatPrice(shippingCents, order.currency);
  const rows = order.items
    .map((i) =>
      amountRow(
        `${i.title} × ${i.quantity}`,
        formatPrice(i.unit_price_cents * i.quantity, order.currency),
      ),
    )
    .join("");
  const body =
    p("Thank you for your order. We’ve received it and will source, inspect, and ship it to you with care.") +
    microLabel("Confirmation number") +
    bigValue(escapeHtml(num)) +
    table(
      rows +
        amountRow("Shipping", shippingLabel, { rule: false }) +
        amountRow("Total", formatPrice(order.total_cents, order.currency), { strong: true, rule: false }),
    ) +
    note("Most items dispatch within 1–3 weeks; we’ll email again when yours ships.") +
    button({ label: "Track your order", href: `${SITE_URL}/shop/orders` });
  return sendLoggedEmail("order_confirmation", {
    to: order.email,
    subject: `Order confirmed: ${num}`,
    html: emailLayout({ heading: "Your order is confirmed", bodyHtml: body, eyebrow: "Purify Shop" }),
  });
}

/**
 * The buyer's word that their money is on its way back (1.8). The refund
 * route told only the seller, so a buyer who asked for a refund heard nothing
 * until their bank statement. Sent once the refund has gone through Stripe,
 * or been marked as returned some other way.
 */
export async function sendOrderRefundedEmail(order: {
  id: string;
  email: string | null;
  amountCents: number;
  currency: string;
  /** False when the money went back outside Stripe (marked by hand). */
  viaCard: boolean;
}): Promise<SendResult> {
  if (!order.email) return { ok: false, skipped: true };
  const num = orderConfirmationNumber(order.id);
  const body =
    p(`Your refund for order ${escapeHtml(num)} has been sent.`) +
    table(amountRow("Refunded", formatPrice(order.amountCents, order.currency), { strong: true, rule: false })) +
    note(
      order.viaCard
        ? "It goes back to the card you paid with. Most banks show it within five to ten business days."
        : "It was returned to you directly rather than to your card. If anything about it looks wrong, reply to this email.",
    ) +
    button({ label: "See your orders", href: `${SITE_URL}/shop/orders` });
  return sendLoggedEmail("order_refunded", {
    to: order.email,
    subject: `Refund sent: ${num}`,
    html: emailLayout({ heading: "Your refund is on its way", bodyHtml: body, eyebrow: "Purify Shop" }),
  });
}
