import "server-only";

import { amountRow, bigValue, button, microLabel, note, p, table } from "@/lib/email/blocks";
import { emailLayout } from "@/lib/email/layout";
import { escapeHtml, sendEmail, type SendResult } from "@/lib/email/send";
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
  return sendEmail({
    to: order.email,
    subject: `Order confirmed: ${num}`,
    html: emailLayout({ heading: "Your order is confirmed", bodyHtml: body, eyebrow: "Purify Shop" }),
  });
}
