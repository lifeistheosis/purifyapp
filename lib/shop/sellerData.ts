import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  ShopConversation,
  ShopProduct,
  ShopProductMedia,
  ShopRefundRequest,
  ShopSellerOrder,
} from "./types";

/**
 * Console reads. Everything runs on the seller's own session client so
 * the RLS owner policies do the scoping; a failure degrades to an empty
 * list (the console renders honest empty states, never a 500). The
 * seller_id filters are belt-and-braces on top of RLS, not instead of it.
 */

const ORDER_SELECT =
  "id, items_total_cents, shipping_cents, tax_cents, total_cents, currency, payment_status, fulfillment_status, outbound_tracking, email, shipping_address, created_at, updated_at, items:shop_order_items(product_id, title, unit_price_cents, quantity)";

export async function listSellerOrders(
  sellerId: string,
): Promise<ShopSellerOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .select(ORDER_SELECT)
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    console.warn("[shop] seller orders failed", error.message);
    return [];
  }
  return (data ?? []) as unknown as ShopSellerOrder[];
}

export async function getSellerOrder(
  sellerId: string,
  orderId: string,
): Promise<ShopSellerOrder | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_orders")
    .select(ORDER_SELECT)
    .eq("seller_id", sellerId)
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    console.warn("[shop] seller order failed", error.message);
    return null;
  }
  return (data as unknown as ShopSellerOrder) ?? null;
}

export type SellerConversation = ShopConversation & {
  messages?: { body: string; sender: string; created_at: string }[];
};

export async function listSellerConversations(
  sellerId: string,
): Promise<SellerConversation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_conversations")
    .select("*")
    .eq("seller_id", sellerId)
    .order("last_message_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("[shop] seller conversations failed", error.message);
    return [];
  }
  return (data ?? []) as SellerConversation[];
}

export function conversationUnreadForSeller(c: ShopConversation): boolean {
  if (!c.seller_last_read_at) return true;
  return c.last_message_at > c.seller_last_read_at;
}

export type SellerRefund = ShopRefundRequest & {
  order: Pick<
    ShopSellerOrder,
    "id" | "total_cents" | "currency" | "payment_status" | "created_at"
  > & { items: { title: string; quantity: number }[] };
};

export async function listSellerRefunds(
  sellerId: string,
): Promise<SellerRefund[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_refund_requests")
    .select(
      "*, order:shop_orders!inner(id, seller_id, total_cents, currency, payment_status, created_at, items:shop_order_items(title, quantity))",
    )
    .eq("order.seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("[shop] seller refunds failed", error.message);
    return [];
  }
  return (data ?? []) as unknown as SellerRefund[];
}

export type SellerProduct = ShopProduct & { media: ShopProductMedia[] };

export async function listSellerProducts(
  sellerId: string,
): Promise<SellerProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_products")
    .select(
      "*, media:shop_product_media(id, media_url, alt_text, sort_order, is_primary)",
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("[shop] seller products failed", error.message);
    return [];
  }
  const products = (data ?? []) as SellerProduct[];
  for (const p of products) {
    p.media.sort((a, b) =>
      a.is_primary !== b.is_primary
        ? Number(b.is_primary) - Number(a.is_primary)
        : a.sort_order - b.sort_order,
    );
  }
  return products;
}
