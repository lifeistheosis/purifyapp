import "server-only";

// Server-side subscription counts for the admin hub, derived from the
// entitlements table (the only place Plus/Pro state lives). Reused by the
// Revenue and Subscriptions routes so both agree on the numbers.
//
// There is NO subscription history or event log (the RevenueCat webhook
// overwrites a single mutable row and discards the event), so new/churned
// cohorts are not derivable here — only the current active picture.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubscriberCounts } from "@/lib/premium/mrr";

export type SubscriptionStats = {
  /** plus_until in the future (includes Pro, which is a Plus superset). */
  activePlus: number;
  /** pro_until in the future. */
  activePro: number;
  /** active Plus but not Pro. */
  plusOnly: number;
  /** is_supporter = true (pre-launch lifetime-sync promise). */
  supporters: number;
  /** active Plus (incl. Pro) grouped by plus_source. */
  bySource: Record<string, number>;
  /** Paid-only counts (comped accounts excluded) for the MRR estimate. */
  paidCounts: SubscriberCounts;
};

export async function subscriptionStats(
  admin: SupabaseClient,
): Promise<SubscriptionStats> {
  const { data } = await admin
    .from("entitlements")
    .select("plus_until, pro_until, plus_source, is_supporter");

  const rows = data ?? [];
  const now = Date.now();
  const future = (ts: string | null) => !!ts && new Date(ts).getTime() > now;

  let activePlus = 0;
  let activePro = 0;
  let plusOnly = 0;
  let supporters = 0;
  let plusOnlyPaid = 0;
  let proPaid = 0;
  const bySource: Record<string, number> = {};

  for (const r of rows as {
    plus_until: string | null;
    pro_until: string | null;
    plus_source: string | null;
    is_supporter: boolean | null;
  }[]) {
    if (r.is_supporter) supporters += 1;
    const pro = future(r.pro_until);
    const plus = pro || future(r.plus_until);
    if (!plus) continue;

    activePlus += 1;
    const source = r.plus_source || "unknown";
    bySource[source] = (bySource[source] ?? 0) + 1;
    const comped = source === "comp";

    if (pro) {
      activePro += 1;
      if (!comped) proPaid += 1;
    } else {
      plusOnly += 1;
      if (!comped) plusOnlyPaid += 1;
    }
  }

  return {
    activePlus,
    activePro,
    plusOnly,
    supporters,
    bySource,
    paidCounts: { plusOnly: plusOnlyPaid, pro: proPaid },
  };
}
