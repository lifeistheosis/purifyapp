import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { ShopSeller, ShopStore } from "./types";

/**
 * Seller identity for the console and the seller API routes. A seller
 * is a signed-in user whose auth.uid() appears on a shop_sellers row —
 * rows only an admin can create (application approval), so this check
 * is the whole authorization story. Reads run with the caller's own
 * session client: RLS self-select policies do the filtering, and a
 * shopper with no seller row simply gets null back.
 */

export type SellerContext = {
  userId: string;
  seller: ShopSeller;
  /** Null only in the half-provisioned window between seller creation
   * and store setup; the console shows a "store being prepared" state. */
  store: (ShopStore & { id: string }) | null;
};

export async function getSellerContext(): Promise<
  | { state: "signed_out" }
  | { state: "not_seller"; userId: string }
  | ({ state: "seller" } & SellerContext)
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: "signed_out" };

  const { data: seller, error } = await supabase
    .from("shop_sellers")
    .select("id, seller_type, public_name, status, verification_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.warn("[shop] seller lookup failed", error.message);
    return { state: "not_seller", userId: user.id };
  }
  if (!seller) return { state: "not_seller", userId: user.id };

  const { data: store } = await supabase
    .from("shop_stores")
    .select("*")
    .eq("seller_id", seller.id)
    .maybeSingle();

  return {
    state: "seller",
    userId: user.id,
    seller: seller as ShopSeller,
    store: (store as SellerContext["store"]) ?? null,
  };
}
