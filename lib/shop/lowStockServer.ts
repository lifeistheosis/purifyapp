import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { notifyOwner } from "@/lib/admin/ownerAlert";
import { pageAllSettled } from "@/lib/supabase/pageAll";

import { crossedLine, reorderThreshold, SALES_WINDOW_DAYS, stockLines, type LowStockRow } from "./lowStock";

/**
 * The reads behind the low-stock lines (./lowStock.ts): which stores are
 * EIKON's own, what their ready-to-ship pieces have left, and how fast each
 * has been selling. Plus the alert after a sale.
 *
 * EIKON is not a flag on a product. It is the store (or stores) whose seller
 * is `purify_owned`, the same fact lib/shop/sellerOrders.ts reads to choose the
 * two-stage fulfillment. Deriving it keeps one source of truth and needs no
 * migration.
 */

/** The stores Purify itself sells from. */
export async function eikonStoreIds(admin: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await admin.from("shop_stores").select("id, seller:shop_sellers(seller_type)");
  if (error) {
    console.warn("[shop] eikon stores read failed", error.message);
    return new Set();
  }
  const ids = new Set<string>();
  for (const row of (data ?? []) as { id: string; seller: { seller_type?: string } | { seller_type?: string }[] | null }[]) {
    const seller = Array.isArray(row.seller) ? row.seller[0] : row.seller;
    if (seller?.seller_type === "purify_owned") ids.add(row.id);
  }
  return ids;
}

/** Units sold per product over the window, paid orders only. */
async function unitsSoldSince(admin: SupabaseClient, sinceIso: string): Promise<Map<string, number>> {
  // In pages. One request stops at 1,000 orders whatever .limit() asks for,
  // and a sales count taken from the first thousand sets every reorder line
  // too low.
  const { data, error } = await pageAllSettled((from, to) =>
    admin
      .from("shop_orders")
      .select("id, items:shop_order_items(product_id, quantity)")
      .eq("payment_status", "paid")
      .gte("created_at", sinceIso)
      .order("id")
      .range(from, to),
  );
  const sold = new Map<string, number>();
  if (error) {
    console.warn("[shop] sales read failed", error.message);
    return sold;
  }
  for (const o of data as { items: { product_id: string | null; quantity: number }[] }[]) {
    for (const i of o.items ?? []) {
      if (!i.product_id) continue;
      sold.set(i.product_id, (sold.get(i.product_id) ?? 0) + i.quantity);
    }
  }
  return sold;
}

function windowStart(now: number): string {
  return new Date(now - SALES_WINDOW_DAYS * 86_400_000).toISOString();
}

/** Every watched EIKON piece with its line, for the Fulfillment tab. */
export async function readStockLines(admin: SupabaseClient, now = Date.now()): Promise<LowStockRow[]> {
  const stores = [...(await eikonStoreIds(admin))];
  if (stores.length === 0) return [];
  const [productsRes, sold] = await Promise.all([
    // In pages, so a piece past the thousandth is still watched.
    pageAllSettled((from, to) =>
      admin
        .from("shop_products")
        .select("id, slug, title, inventory_status, quantity_available")
        .in("store_id", stores)
        .eq("status", "published")
        .order("id")
        .range(from, to),
    ),
    unitsSoldSince(admin, windowStart(now)),
  ]);
  if (productsRes.error) {
    console.warn("[shop] stock read failed", productsRes.error.message);
    return [];
  }
  return stockLines(productsRes.data, sold);
}

/**
 * After a sale settles: tell the owner about any EIKON piece this order took
 * across its line. Fired and forgotten from the Stripe webhook, after the
 * sale alert, so it can never hold up a settlement (see lib/admin/ownerAlert.ts
 * on why an alert must never break the thing it reports on).
 *
 * The stock read here is after the paid-inventory step took this order's units
 * off, so "before" is the count plus what this order bought. Only a crossing
 * alerts: a piece already below its line does not buzz on every later sale.
 */
export async function alertLowStockAfterSale(admin: SupabaseClient, orderId: string, now = Date.now()): Promise<void> {
  try {
    const { data: items } = await admin.from("shop_order_items").select("product_id, quantity").eq("order_id", orderId);
    const bought = new Map<string, number>();
    for (const i of (items ?? []) as { product_id: string | null; quantity: number }[]) {
      if (i.product_id) bought.set(i.product_id, (bought.get(i.product_id) ?? 0) + i.quantity);
    }
    if (bought.size === 0) return;

    const stores = [...(await eikonStoreIds(admin))];
    if (stores.length === 0) return;
    const { data: products } = await admin
      .from("shop_products")
      .select("id, title, inventory_status, quantity_available")
      .in("id", [...bought.keys()])
      .in("store_id", stores);
    const watched = ((products ?? []) as {
      id: string;
      title: string;
      inventory_status: string;
      quantity_available: number | null;
    }[]).filter((p) => p.inventory_status === "ready_to_ship" && typeof p.quantity_available === "number");
    if (watched.length === 0) return;

    const sold = await unitsSoldSince(admin, windowStart(now));
    for (const p of watched) {
      const after = p.quantity_available as number;
      const before = after + (bought.get(p.id) ?? 0);
      const threshold = reorderThreshold(sold.get(p.id) ?? 0);
      if (!crossedLine(before, after, threshold)) continue;
      await notifyOwner({
        title: after === 0 ? "Purify: sold out" : "Purify: running low",
        body: after === 0 ? `${p.title} just sold its last one.` : `${p.title}: ${after} left. Time to reorder.`,
        url: "/admin#fulfillment",
        kind: "owner-low-stock",
      });
    }
  } catch (e) {
    console.warn("[shop] low stock alert failed", (e as Error).message);
  }
}
