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

  // THE PIPELINE, not just the takings. Measured on production 2026-08-28:
  // 40 orders, 24 pending, 16 cancelled, ZERO paid. The panel reported that
  // as "$0" and nothing else, which reads as "nobody wants it" when what it
  // actually says is "24 people reached checkout and none of them finished".
  // Those are opposite problems and the operator needs to tell them apart.
  const pendingOrderCount = orders.filter((o) => o.payment_status === "pending").length;
  const cancelledOrderCount = orders.filter((o) => o.payment_status === "cancelled").length;
  const donationsCurrent = donations.length
    ? donations[donations.length - 1]
    : null;

  const mrrCents = estimatedMrrCents(subs.paidCounts);
  // Real subscription revenue, when a v2 key with charts_metrics access is
  // set. Null otherwise, and the estimate below carries the panel as before.
  const live = await getProjectMetrics();
  const arrCents = estimatedArrCents(subs.paidCounts);

  // ── Revenue by source ───────────────────────────────────────────────────
  //
  // THIS DONUT USED TO COMPARE MONEY RECEIVED WITH MONEY NOT YET EARNED. Its
  // three slices were shop net (realized, all-time), donations (realized,
  // all-time) and "Subscriptions (est. ARR)", which is a twelve-month FORWARD
  // PROJECTION computed from today's subscriber count times a list price.
  //
  // Those are not the same kind of number and they cannot share a pie. On
  // production the effect was severe rather than academic: the shop has never
  // taken a payment and donations have never been recorded, so both realized
  // slices are zero, and the chart rendered as a single full circle of a
  // projection. It read as "subscriptions are 100% of our revenue" when what
  // it actually showed was "we have no revenue and here is a forecast".
  //
  // Realized only now. A source with nothing realized contributes nothing,
  // and the estimate keeps its own place in the run-rate card lower down,
  // where it is labelled as a run rate and not summed against cash.
  const subsRealizedCents = live ? Math.round(live.totalRevenue * 100) : null;
  const bySource = [
    { name: "Shop (net)", value: summary.netCents },
    { name: "Donations", value: donationsTotal },
    // Omitted, not zeroed, when RevenueCat is not configured: a zero slice
    // would claim subscriptions earned nothing, and the truth is that nothing
    // here can see what they earned. The UI says which case it is in.
    ...(subsRealizedCents != null
      ? [{ name: "Subscriptions", value: subsRealizedCents }]
      : []),
  ];

  // What the business has actually taken, across every source that can answer.
  // Deliberately NOT a sum that silently treats an unmeasured source as zero:
  // `complete` is false whenever a source could not report, and the UI is
  // required to qualify the figure when it is.
  const realizedTotalCents =
    summary.netCents + donationsTotal + (subsRealizedCents ?? 0);
  const realizedComplete = subsRealizedCents != null && donations.length > 0;

  return NextResponse.json(
    {
      shop: {
        grossCents: summary.grossCents,
        netCents: summary.netCents,
        refundedCents: summary.refundedCents,
        averageOrderCents: summary.averageOrderCents,
        refundRate: summary.refundRate,
        // Both, and named for what they are. paidOrderCount includes orders
        // that were later refunded, which is what refundRate divides by;
        // keptOrderCount is the one that matches netCents and the one the
        // panel prints beside the word "paid".
        paidOrderCount: summary.paidOrderCount,
        keptOrderCount: summary.keptOrderCount,
        refundedOrderCount: summary.refundedOrderCount,
        pendingOrderCount,
        cancelledOrderCount,
        unitsSold: summary.unitsSold,
        monthly,
        topProducts: top,
      },
      donations: {
        totalCents: donationsTotal,
        current: donationsCurrent,
        monthly: donations,
        // NOT MEASURED IS NOT ZERO. donations_monthly is a manual snapshot
        // table and nothing writes to it automatically; on production it has
        // no rows at all. Reporting a bare 0 tells the operator donations
        // were received and totalled nothing, when the truth is that no
        // figure has ever been recorded. The UI must render these
        // differently, and this flag is how it can.
        recorded: donations.length > 0,
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
      realized: {
        totalCents: realizedTotalCents,
        /** False when a source could not report and is missing from the sum. */
        complete: realizedComplete,
        shopCents: summary.netCents,
        donationsCents: donationsTotal,
        /** Null when RevenueCat is not configured: unmeasured, not zero. */
        subscriptionsCents: subsRealizedCents,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
