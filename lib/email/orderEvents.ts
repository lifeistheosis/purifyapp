import "server-only";

import { after } from "next/server";

import { orderConfirmationNumber } from "@/lib/shop/orderNumber";
import { trackingLink } from "@/lib/shop/trackingLink";
import { createAdminClient } from "@/lib/supabase/admin";

import { sendEmailOnce } from "./ledger";
import { orderShippedEmail } from "./templates/orders";

/**
 * "Your order is on its way", sent when the owner adds tracking to a paid shop
 * order in the admin. The EIKON Box has always had this; the shop had not, so a
 * buyer's parcel could be in transit with the only record of it in the admin.
 *
 * Scheduled with after() from the order update route, once the save has
 * succeeded, so the owner's save is never slowed or failed by the mail provider.
 * The order is re-read rather than trusted from the request: only a PAID order
 * with an address to write to gets the email.
 *
 * Keyed on the order AND the tracking number. Saving the same number twice is
 * one email; correcting a mistyped number sends the corrected one, which is the
 * one the buyer needs.
 */
export function scheduleOrderShipped(orderId: string, tracking: string) {
  const number = tracking.replace(/\s+/g, "").toUpperCase();
  if (!number) return;

  const run = async () => {
    const admin = createAdminClient();
    const { data: order, error } = await admin
      .from("shop_orders")
      .select("id, email, user_id, payment_status")
      .eq("id", orderId)
      .maybeSingle();
    if (error || !order) {
      console.warn(`[email] order ${orderId} not read for the shipped email: ${error?.message ?? "missing"}`);
      return;
    }
    const row = order as { id: string; email: string | null; user_id: string | null; payment_status: string };
    if (row.payment_status !== "paid" || !row.email) return;

    const content = orderShippedEmail({
      orderNumber: orderConfirmationNumber(row.id),
      tracking: number,
      link: trackingLink(number),
    });
    const result = await sendEmailOnce(admin, {
      dedupeKey: `order_shipped:${row.id}:${number}`,
      kind: "order_shipped",
      userId: row.user_id,
      to: row.email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
    console.info(`[email] order_shipped ${row.id}: ${result.status}`);
  };

  const guarded = () => run().catch((e) => console.warn(`[email] order_shipped threw: ${(e as Error).message}`));
  try {
    after(guarded);
  } catch {
    void guarded();
  }
}
