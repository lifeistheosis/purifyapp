import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Mirror an ambassador's Stripe Express account onto their row: can Stripe
 * pay them yet. An ambassador only ever receives transfers, so what matters
 * is the transfers capability and payouts to their bank, not card payments.
 *
 * Called from the Stripe webhook on account.updated (the same event that
 * keeps sellers' stores in step) and when an ambassador comes back from
 * Stripe's onboarding. Returns true when the account was an ambassador's.
 */
export function canReceive(account: {
  payouts_enabled?: boolean | null;
  capabilities?: { transfers?: string | null } | null;
}): boolean {
  return Boolean(account.payouts_enabled) && account.capabilities?.transfers === "active";
}

export async function syncAmbassadorAccount(
  accountId: string,
  account: { payouts_enabled?: boolean | null; capabilities?: { transfers?: string | null } | null },
): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient()
      .from("ambassadors")
      .update({ payouts_enabled: canReceive(account), updated_at: new Date().toISOString() })
      .eq("stripe_account_id", accountId)
      .select("id");
    if (error) return false;
    return (data ?? []).length > 0;
  } catch {
    return false;
  }
}
