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
      supporters: subs.supporters,
      bySource: subs.bySource,
      mrrCents: estimatedMrrCents(subs.paidCounts),
      arrCents: estimatedArrCents(subs.paidCounts),
      estimated: true,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
