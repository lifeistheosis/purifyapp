import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { DEVELOPER_EMAILS } from "@/lib/dev/developer";

/**
 * The Stripe payment intents of his own test orders (lib/admin/testOrders.ts),
 * so the Stripe ledger can leave their charges and refunds out as the books
 * leave the orders out. A handful of rows, read whole.
 *
 * Never throws: when the orders cannot be read, nothing is left out of the
 * ledger, which is how it read before item 54, and an overstated figure rather
 * than a panel that fails.
 */
export async function ownTestIntents(admin: SupabaseClient): Promise<Set<string>> {
  try {
    const { data, error } = await admin
      .from("shop_orders")
      .select("stripe_payment_intent")
      .or(DEVELOPER_EMAILS.map((email) => `email.ilike."${email}"`).join(","))
      .not("stripe_payment_intent", "is", null)
      .limit(1000);
    if (error) return new Set();
    return new Set(((data ?? []) as { stripe_payment_intent: string | null }[]).flatMap((r) => (r.stripe_payment_intent ? [r.stripe_payment_intent] : [])));
  } catch {
    return new Set();
  }
}
