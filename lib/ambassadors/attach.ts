import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { refFromCookieHeader } from "./referral";

/**
 * Write the ambassador code the buyer arrived with onto their new order, so
 * the database can record the commission when the order is paid
 * (supabase/migrations/20260930000000_ambassadors.sql, shop_order_commission).
 *
 * Called by the checkout route right after the order row exists and before
 * Stripe's page opens, so it is always in place before payment. It is best
 * effort by design and outside checkout's own pricing and settlement code
 * (lib/shop/checkout.ts is untouched): no code, an unknown or paused
 * ambassador, the buyer's own code, or a database without the migration yet
 * all end quietly with nothing written, and the checkout carries on exactly
 * as it would have.
 *
 * Only a pending order is touched, so a slow call can never re-label an order
 * that has already been paid.
 */
export async function attachReferral(orderId: string, cookieHeader: string | null, buyerId: string | null): Promise<void> {
  const code = refFromCookieHeader(cookieHeader);
  if (!code) return;
  try {
    const admin = createAdminClient();
    const { data: amb, error } = await admin.from("ambassadors").select("user_id, status").eq("code", code).maybeSingle();
    if (error || !amb || amb.status !== "active" || (buyerId && amb.user_id === buyerId)) return;
    const { error: writeError } = await admin
      .from("shop_orders")
      .update({ ambassador_code: code })
      .eq("id", orderId)
      .eq("payment_status", "pending");
    if (writeError) console.warn("[ambassadors] referral not recorded", writeError.message);
  } catch (e) {
    console.warn("[ambassadors] referral skipped", (e as Error).message);
  }
}
