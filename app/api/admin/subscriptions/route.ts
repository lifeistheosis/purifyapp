import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscriptionStats } from "@/lib/entitlements/adminStats";
import { estimatedMrrCents, estimatedArrCents } from "@/lib/premium/mrr";
import { getProjectMetrics } from "@/lib/billing/revenuecatMetrics";

export const dynamic = "force-dynamic";

/**
 * The current subscription picture from the entitlements table: active
 * Plus (includes Pro), active Pro, Plus-only, supporters, a breakdown by
 * source, and an ESTIMATED MRR/ARR (no billed amount is stored — see
 * lib/premium/mrr.ts). Who joined and who left, week by week, is
 * /api/admin/plus-history, from the RevenueCat events the webhook keeps from
 * 1.9 (admin item A2); a member in a free trial is counted apart once those
 * events can say who is in one.
 */
export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const subs = await subscriptionStats(admin);
  // RevenueCat's real MRR when it answers, as the Revenue tab reads it, so the
  // two tabs never show two different run rates for one business.
  const live = await getProjectMetrics();
  const mrrCents = live ? Math.round(live.mrr * 100) : estimatedMrrCents(subs.paidCounts);

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
      legacyPlus: subs.legacyPlus,
      /** In a free trial now, from the kept RevenueCat events (admin item A2); not in paidPlus. */
      trialPlus: subs.trialPlus,
      trialsKnown: subs.trialsKnown,
      supporters: subs.supporters,
      bySource: subs.bySource,
      mrrCents,
      arrCents: live ? mrrCents * 12 : estimatedArrCents(subs.paidCounts),
      estimated: !live,
      /** RevenueCat's own counts, when it answers: paying subscriptions and trials. */
      live: live ? { activeSubscriptions: live.activeSubscriptions, activeTrials: live.activeTrials } : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
