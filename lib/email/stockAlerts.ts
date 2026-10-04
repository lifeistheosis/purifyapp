import "server-only";

import { after } from "next/server";

import { emailsByUserId } from "@/lib/admin/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageAllSettled } from "@/lib/supabase/pageAll";

import { sendEmailOnce } from "./ledger";
import { siteUrl } from "./templates/build";
import { backInStockEmail } from "./templates/orders";

/**
 * Fire the back-in-stock alerts for a product that just came back.
 *
 * Scheduled by the admin product save when a published piece leaves
 * out_of_stock. Each waiting alert gets one email (keyed on the alert, so a
 * second save is a duplicate) and is stamped notified_at, which is what makes
 * it fire once. The product is re-read, so a save that put it back out of stock
 * or unpublished it in the same breath sends nothing.
 */
export function scheduleBackInStock(productId: string) {
  const run = async () => {
    const admin = createAdminClient();
    const { data: product } = await admin
      .from("shop_products")
      .select("id, title, slug, status, inventory_status")
      .eq("id", productId)
      .maybeSingle();
    const p = product as { title: string; slug: string; status: string; inventory_status: string } | null;
    if (!p || p.status !== "published" || p.inventory_status === "out_of_stock") return;

    // Everyone waiting, in pages. One request stops at 1,000 rows whatever
    // .limit() asks for, so a piece more than a thousand readers were waiting
    // on would have told a thousand of them and left the rest waiting until
    // the next time it sold out and came back.
    const { data: rows, error } = await pageAllSettled<{ id: string; user_id: string }>((from, to) =>
      admin
        .from("stock_alerts")
        .select("id, user_id")
        .eq("product_id", productId)
        .is("notified_at", null)
        .order("id")
        .range(from, to),
    );
    if (error) {
      console.warn(`[email] stock alerts not read for ${productId}: ${error.message}`);
      return;
    }
    if (rows.length === 0) return;

    const addresses = await emailsByUserId(admin, [...new Set(rows.map((r) => r.user_id))]);
    const content = backInStockEmail({ title: p.title, href: siteUrl(`/shop/icons/${p.slug}`) });
    const done: string[] = [];

    for (const alert of rows) {
      const to = addresses.get(alert.user_id);
      if (!to) continue;
      const r = await sendEmailOnce(admin, {
        dedupeKey: `back_in_stock:${alert.id}`,
        kind: "back_in_stock",
        userId: alert.user_id,
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
      // Sent now, or sent by an earlier save: either way this alert is done.
      if (r.status === "sent" || r.status === "duplicate") done.push(alert.id);
    }

    // A hundred at a time: the ids travel in the address of the request, and a
    // long enough list is refused before the database sees it.
    const notifiedAt = new Date().toISOString();
    for (let i = 0; i < done.length; i += 100) {
      await admin.from("stock_alerts").update({ notified_at: notifiedAt }).in("id", done.slice(i, i + 100));
    }
    console.info(`[email] back_in_stock ${productId}: ${done.length} of ${rows.length}`);
  };

  const guarded = () => run().catch((e) => console.warn(`[email] back_in_stock threw: ${(e as Error).message}`));
  try {
    after(guarded);
  } catch {
    void guarded();
  }
}
