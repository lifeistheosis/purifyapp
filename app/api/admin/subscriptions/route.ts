import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscriptionStats } from "@/lib/entitlements/adminStats";
import { estimatedMrrCents, estimatedArrCents } from "@/lib/premium/mrr";

export const dynamic = "force-dynamic";

/**
 * The current subscription picture from the entitlements table: active
 * Plus (includes Pro), active Pro, Plus-only, supporters, a breakdown by
 * source, and an ESTIMATED MRR/ARR (no billed amount is stored — see
 * lib/premium/mrr.ts). New/churned cohorts are NOT available: entitlements
 * is a single mutable row and the RevenueCat webhook discards its events.
 */
export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const subs = await subscriptionStats(admin);

  return NextResponse.json(
    {
      activePlus: subs.activePlus,
      activePro: subs.activePro,
      plusOnly: subs.plusOnly,
      // THE TAB'S THREE HEADLINE CARDS READ THESE, and the route never sent
      // them, so Paying / Comped / Gifted rendered as three em dashes while
      // "Active Plus" beside them read 16. Commerce Overview meanwhile showed
      // Paid Plus 3, because it reads a payload that does carry the split.
      // The operator saw 16 on one tab and 3 on another, and the three cards
      // that exist to explain the gap were the blank ones.
      //
      // subscriptionStats() has computed all three the whole time; only the
      // projection was missing.
      paidPlus: subs.paidPlus,
      compedPlus: subs.compedPlus,
      giftedPlus: subs.giftedPlus,
      supporters: subs.supporters,
      bySource: subs.bySource,
      mrrCents: estimatedMrrCents(subs.paidCounts),
      arrCents: estimatedArrCents(subs.paidCounts),
      estimated: true,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
