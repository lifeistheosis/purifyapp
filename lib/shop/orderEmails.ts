import "server-only";

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
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;color:#3a3540">${escapeHtml(i.title)} &times; ${i.quantity}</td>` +
        `<td align="right" style="padding:6px 0;color:#1a1720;white-space:nowrap">${formatPrice(i.unit_price_cents * i.quantity, order.currency)}</td></tr>`,
    )
    .join("");
  const body = `
    <p style="margin:0 0 16px">Thank you for your order. We&rsquo;ve received it and will source, inspect, and ship it to you with care.</p>
    <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:13px;letter-spacing:.5px;text-transform:uppercase;color:#8a8580">Confirmation number</p>
    <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:22px;font-weight:bold;letter-spacing:1px;color:#1a1720">${num}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;border-top:1px solid #eeeae5;margin-top:4px">${rows}
      <tr><td style="padding:10px 0 0;border-top:1px solid #eeeae5;color:#8a8580">Shipping</td><td align="right" style="padding:10px 0 0;color:#1a1720">Free</td></tr>
      <tr><td style="padding:6px 0;font-weight:bold;color:#1a1720">Total</td><td align="right" style="padding:6px 0;font-weight:bold;color:#1a1720">${formatPrice(order.total_cents, order.currency)}</td></tr>
    </table>
    <p style="margin:20px 0 0;font-size:14px;color:#8a8580">Most items dispatch within 1&ndash;3 weeks; we&rsquo;ll email again when yours ships.</p>
    <p style="margin:18px 0 0"><a href="${SITE_URL}/shop/orders" style="color:#b8892f;text-decoration:none">Track your order &rarr;</a></p>`;
  return sendEmail({
    to: order.email,
    subject: `Order confirmed — ${num}`,
    html: emailLayout({ heading: "Your order is confirmed", bodyHtml: body }),
  });
}
