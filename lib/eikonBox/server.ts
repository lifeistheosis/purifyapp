import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStoredAddress } from "./address";
import type { MemberDrop, ShippingAddress } from "./types";

/**
 * Server-side EIKON Box helpers.
 *
 * THE GATE. Membership is read straight off entitlements.pro_until, exactly
 * like hasProShipping() in lib/shop/checkout.ts. It is deliberately NOT
 * derived through getEntitlements()/deriveEntitlements(): both enforcement
 * flags default to false, so `proFeatures` is true for everyone, and gating
 * a physical box on it would post an icon to every free account in the
 * database. OPEN_ENTITLEMENTS.pro is false for this exact reason, and the
 * comment there points here.
 */

/** The member's Pro expiry, or null if they have never had one. */
export async function proUntilFor(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("entitlements")
      .select("pro_until")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.pro_until as string | null) ?? null;
  } catch {
    return null;
  }
}

/** Is this member Pro right now? */
export async function isProNow(userId: string | null): Promise<boolean> {
  const until = await proUntilFor(userId);
  return Boolean(until && new Date(until).getTime() > Date.now());
}

/** Row shape as it comes back from eikon_drops. */
type DropRow = {
  id: string;
  title: string;
  period_month: string;
  teaser: string | null;
  image_url: string | null;
  status: MemberDrop["status"];
  claims_open_at: string | null;
  claims_close_at: string | null;
};

/**
 * Project a drop row down to what a member may see.
 *
 * eikon_drops has no RLS select policy at all, so drops only ever reach a
 * member through this function. That is what keeps sourcing_notes (supplier
 * names and unit costs) off the wire.
 */
export function toMemberDrop(row: DropRow): MemberDrop {
  return {
    id: row.id,
    title: row.title,
    periodMonth: row.period_month,
    teaser: row.teaser,
    imageUrl: row.image_url,
    status: row.status,
    claimsOpenAt: row.claims_open_at,
    claimsCloseAt: row.claims_close_at,
  };
}

export const MEMBER_DROP_COLUMNS =
  "id, title, period_month, teaser, image_url, status, claims_open_at, claims_close_at";

/**
 * The address to offer a member who has never given us one: whatever they
 * last had a paid shop order shipped to. Same jsonb shape, so no conversion.
 * Quietly returns null on any miss; this is a convenience, not a feature.
 */
export async function suggestedAddressFor(
  userId: string,
): Promise<ShippingAddress | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("shop_orders")
      .select("shipping_address")
      .eq("user_id", userId)
      .eq("payment_status", "paid")
      .not("shipping_address", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return parseStoredAddress(data?.shipping_address);
  } catch {
    return null;
  }
}
