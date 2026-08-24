import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  earningsSummary,
  monthlyEarnings,
  topProducts,
} from "@/lib/shop/earnings";
import { subscriptionStats } from "@/lib/entitlements/adminStats";
import { estimatedMrrCents, estimatedArrCents } from "@/lib/premium/mrr";
import { getProjectMetrics, realArpuAnnual } from "@/lib/billing/revenuecatMetrics";

export const dynamic = "force-dynamic";

/**
 * Unified revenue for the owner: shop order revenue (net of refunds),
 * donations (Buy Me a Coffee snapshots), and ESTIMATED subscription MRR.
 * Shop math reuses the pure aggregators in lib/shop/earnings.ts; the
 * subscription figure is an estimate (see lib/premium/mrr.ts) because no
 * billed amount is stored anywhere.
 */
export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  const [ordersRes, donationsRes, subs] = await Promise.all([
    admin
      .from("shop_orders")
      // id and items_total_cents feed earningsSummary: the first keys the
      // commission lookup, the second separates goods from shipping so this
      // route's gross figure and its top-products figure reconcile.
      .select("id, items_total_cents, total_cents, payment_status, created_at, items:shop_order_items(product_id, title, unit_price_cents, quantity)")
      .order("created_at", { ascending: false })
      .limit(5000),
    admin
      .from("donations_monthly")
      .select("year_month, total_cents, supporters")
      .order("year_month", { ascending: true }),
    subscriptionStats(admin),
  ]);

  const orders = (ordersRes.data ?? []) as {
    id: string;
    items_total_cents: number;
    total_cents: number;
    payment_status: "pending" | "paid" | "refunded" | "cancelled";
    created_at: string;
    items: {
      product_id: string | null;
      title: string;
      unit_price_cents: number;
      quantity: number;
    }[];
  }[];

  // No fee map on purpose. This is the OWNER's revenue view across every
  // store, where Purify's commission is income rather than a deduction;
  // subtracting it here would understate what the business made. summary
  // reports commissionCents as null, which is correct: unasked, not zero.
  const summary = earningsSummary(orders);
  const monthly = monthlyEarnings(orders);
  const top = topProducts(orders, 8);

  const donations = (donationsRes.data ?? []) as {
    year_month: string;
    total_cents: number;
    supporters: number;
  }[];
  const donationsTotal = donations.reduce((a, d) => a + d.total_cents, 0);
  const donationsCurrent = donations.length
    ? donations[donations.length - 1]
    : null;

  const mrrCents = estimatedMrrCents(subs.paidCounts);
  // Real subscription revenue, when a v2 key with charts_metrics access is
  // set. Null otherwise, and the estimate below carries the panel as before.
  const live = await getProjectMetrics();
  const arrCents = estimatedArrCents(subs.paidCounts);

  // Revenue-by-source for the current picture: shop net (all-time here for
  // a stable donut), donations all-time, and subscriptions annualized run
  // rate. Labeled in the UI; this is a mix of realized + estimated.
  const bySource = [
    { name: "Shop (net)", value: summary.netCents },
    { name: "Donations", value: donationsTotal },
    { name: "Subscriptions (est. ARR)", value: arrCents },
  ];

  return NextResponse.json(
    {
      shop: {
        grossCents: summary.grossCents,
        netCents: summary.netCents,
        refundedCents: summary.refundedCents,
        averageOrderCents: summary.averageOrderCents,
        refundRate: summary.refundRate,
        paidOrderCount: summary.paidOrderCount,
        unitsSold: summary.unitsSold,
        monthly,
        topProducts: top,
      },
      donations: {
        totalCents: donationsTotal,
        current: donationsCurrent,
        monthly: donations,
      },
      subscriptions: {
        // Real figures where RevenueCat answers, the list-price estimate
        // where it does not. `estimated` stops being a constant: it is now
        // the truth about which of the two this payload is carrying, and the
        // UI is required to say so either way.
        mrrCents: live ? Math.round(live.mrr * 100) : mrrCents,
        arrCents: live ? Math.round(live.arr * 100) : arrCents,
        activePlus: subs.activePlus,
        activePro: subs.activePro,
        estimated: !live,
        // Kept alongside the real number rather than replaced, so a gap
        // between what RevenueCat bills and what list price implies is
        // visible instead of silently resolved. That gap is discounts,
        // regional pricing, annual plans and store commission, which is
        // exactly what the estimate could never see.
        estimatedMrrCents: mrrCents,
        live: live
          ? {
              activeSubscriptions: live.activeSubscriptions,
              activeTrials: live.activeTrials,
              totalRevenue: live.totalRevenue,
              currency: live.currency,
              lastUpdatedAt: live.lastUpdatedAt,
              annualArpu: realArpuAnnual(live),
            }
          : null,
        source: live ? ("revenuecat" as const) : ("list-price-estimate" as const),
      },
      bySource,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
