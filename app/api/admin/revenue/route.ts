import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageAllSettled } from "@/lib/supabase/pageAll";
import {
  earningsSummary,
  monthlyEarnings,
  topProducts,
} from "@/lib/shop/earnings";
import { subscriptionStats } from "@/lib/entitlements/adminStats";
import { estimatedMrrCents, estimatedArrCents } from "@/lib/premium/mrr";
import { getProjectMetrics, getRevenueBetween, realArpuAnnual } from "@/lib/billing/revenuecatMetrics";
import { cachedLedger, monthlyNet, notShopCents } from "@/lib/billing/stripeLedger";
import { INVESTOR_PLAN } from "@/lib/invest/plan";
import { paidTotals, refundsByOrder } from "@/lib/shop/partialRefunds";
import { realizedRevenue } from "@/lib/admin/realized";
import { abandonmentStats, aovSplit, type MetricsOrder } from "@/lib/shop/commerceMetrics";
import { eikonStoreIds } from "@/lib/shop/lowStockServer";

export const dynamic = "force-dynamic";

/**
 * Unified revenue for the owner: shop order revenue (net of refunds, partial
 * ones included), donations (typed in by hand, shown apart), and Plus.
 *
 * Plus is RevenueCat's when it answers: its MRR, paying subscriptions and
 * trials from the overview, and what members paid since launch from its
 * revenue endpoint (lib/billing/revenuecatMetrics.ts). When it does not, MRR
 * is the list-price estimate (lib/premium/mrr.ts), labelled so, and the
 * realized total carries the website's Plus from Stripe and says that Plus
 * bought through Google Play and the App Store is not in it.
 *
 * Until 2026-11-09 the RevenueCat half never worked: its parser read a shape
 * RevenueCat does not send, so every answer was dropped and the estimate
 * stood in, with the key set. The realized total then fell back to what
 * Stripe had paid out to the bank, which lags sales by days, is a transfer
 * rather than a sale, and holds no Plus bought on Google Play; it still said
 * "complete".
 */
export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  const [ordersRes, donationsRes, subs, eikonStores] = await Promise.all([
    // EVERY ORDER, IN PAGES. This asked for 5,000 in one request, and the API
    // returns at most 1,000 whatever .limit() says, without an error. Newest
    // first, that keeps the latest thousand: every all-time figure below
    // (gross, net, refunds, the monthly series, top products) would have
    // quietly become "the last thousand orders" and gone on reading as all.
    pageAllSettled((from, to) =>
      admin
        .from("shop_orders")
        // id and items_total_cents feed earningsSummary: the first keys the
        // commission lookup, the second separates goods from shipping so this
        // route's gross figure and its top-products figure reconcile.
        // user_id and store_id feed the split and the abandonment figures
        // (lib/shop/commerceMetrics.ts).
        .select("id, user_id, store_id, items_total_cents, total_cents, payment_status, created_at, items:shop_order_items(product_id, title, unit_price_cents, quantity)")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    ),
    admin
      .from("donations_monthly")
      .select("year_month, total_cents, supporters")
      .order("year_month", { ascending: true }),
    subscriptionStats(admin),
    eikonStoreIds(admin),
  ]);

  const orders = (ordersRes.data ?? []) as {
    id: string;
    user_id: string | null;
    store_id: string | null;
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

  // Partial refunds leave an order paid; the part that went back is on its
  // refund requests. A failed read is said (partialRefundsRead), never taken
  // as "none".
  const partialRefunds = await refundsByOrder(admin, paidTotals(orders));

  // No fee map on purpose. This is the OWNER's revenue view across every
  // store, where Purify's commission is income rather than a deduction;
  // subtracting it here would understate what the business made. summary
  // reports commissionCents as null, which is correct: unasked, not zero.
  const summary = earningsSummary(orders, undefined, partialRefunds);
  const monthly = monthlyEarnings(orders, partialRefunds);
  const top = topProducts(orders, 8);
  // The average order for EIKON and for the marketplace, and how many
  // checkouts are walked away from and won back (asked for 2026-09-30).
  const metricsOrders = orders as MetricsOrder[];
  const split = aovSplit(metricsOrders, eikonStores);
  const abandonment = abandonmentStats(metricsOrders, Date.now());

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

  const estimatedMrr = estimatedMrrCents(subs.paidCounts);
  // Real subscription figures, when a v2 key with charts_metrics access is
  // set. Null otherwise, and the estimate carries the panel as before.
  const live = await getProjectMetrics();
  const today = new Date().toISOString().slice(0, 10);
  // What members paid since launch: RevenueCat's revenue (after refunds,
  // before the stores' cut) from the first day Purify could take money.
  const sinceLaunch = await getRevenueBetween(INVESTOR_PLAN.launch, today);
  const mrrCents = live ? Math.round(live.mrr * 100) : estimatedMrr;
  // ARR is not a RevenueCat figure. It is the monthly rate times twelve, a
  // run rate, whichever MRR stands behind it.
  const arrCents = live ? mrrCents * 12 : estimatedArrCents(subs.paidCounts);

  // ── Revenue by source ───────────────────────────────────────────────────
  //
  // REALIZED ONLY. This donut once put a twelve-month forward projection (the
  // estimated ARR) beside cash, and on a shop with no sales it drew one full
  // ring of a forecast. A source with nothing realized contributes nothing;
  // the run rate keeps its own card, labelled as one.
  //
  // DONATIONS ARE NOT A SOURCE HERE. donations_monthly is typed in by the
  // owner, not measured, and a recalled number in a chart of realized revenue
  // looks measured when it is not. Reported on its own, never summed.
  const subsRealizedCents = sinceLaunch ? Math.round(sinceLaunch.value * 100) : null;

  // WHEN RevenueCat CANNOT ANSWER: the website's Plus from Stripe. Web
  // billing charges this Stripe account, so Stripe can say what members paid
  // on the website; it cannot see Google Play or the App Store, and the
  // total says so (complete: false, missing names them).
  const stripe = subsRealizedCents == null ? await cachedLedger("all", new Map()) : null;
  const stripeReadable = !!stripe && stripe.configured && !stripe.error;
  const webPlusCents = stripeReadable && stripe ? notShopCents(stripe.rows) : null;
  // Kept for the Stripe card's line, as what it is: a transfer to the bank.
  const stripePaidOutCents = stripeReadable && stripe ? stripe.summary.payoutsCents : null;
  // The monthly chart from the same ledger, so the trend and the headline
  // come from one source. Null when Stripe is not the source.
  const stripeMonthly = webPlusCents != null && stripe ? monthlyNet(stripe.rows) : null;

  const bySource: { name: string; value: number }[] = [{ name: "Shop (net)", value: summary.netCents }];
  if (subsRealizedCents != null) bySource.push({ name: "Plus (RevenueCat)", value: subsRealizedCents });
  else if (webPlusCents != null) bySource.push({ name: "Website, through Stripe", value: webPlusCents });

  // What customers paid, all time: the rule and its words are in
  // lib/admin/realized.ts, with tests.
  const realized = realizedRevenue({
    shopNetCents: summary.netCents,
    plusCents: subsRealizedCents,
    webPlusCents,
    refundsRead: partialRefunds != null,
  });

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
        /** False when the partial refunds could not be read, so net may hold some of them. */
        partialRefundsRead: partialRefunds != null,
        monthly,
        topProducts: top,
        split,
        abandonment,
      },
      donations: {
        /**
         * SELF-REPORTED. Shown, never counted.
         *
         * `recorded` says whether a figure has ever been entered at all, which
         * is a different question from whether it is accurate. The UI must say
         * both: that a number exists, and that it came from the owner rather
         * than from a payment processor.
         */
        selfReported: true,
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
        // where it does not. `estimated` is the truth about which of the two
        // this payload carries, and the UI says so either way.
        mrrCents,
        arrCents,
        activePlus: subs.activePlus,
        activePro: subs.activePro,
        estimated: !live,
        // Kept beside the real number rather than replaced, so a gap between
        // what RevenueCat bills and what list price implies stays visible:
        // annual plans, trials, regional prices and discounts.
        estimatedMrrCents: estimatedMrr,
        live: live
          ? {
              activeSubscriptions: live.activeSubscriptions,
              activeTrials: live.activeTrials,
              /** What members paid in the last 28 days, after refunds, before the stores' cut (dollars). */
              revenue28d: live.revenue28d,
              newCustomers28d: live.newCustomers28d,
              currency: live.currency,
              lastUpdatedAt: live.lastUpdatedAt,
              annualArpu: realArpuAnnual(live),
            }
          : null,
        source: live ? ("revenuecat" as const) : ("list-price-estimate" as const),
      },
      bySource,
      realized: {
        totalCents: realized.totalCents,
        /** False when a part could not be read; `missing` names it. */
        complete: realized.complete,
        missing: realized.missing,
        shopCents: summary.netCents,
        donationsCents: donationsTotal,
        /** What members paid for Plus since launch, from RevenueCat. Null when it cannot answer: unmeasured, not zero. */
        subscriptionsCents: subsRealizedCents,
        /** What the website took through Stripe for anything but the shop, after refunds. Null unless Stripe stands in for RevenueCat. */
        webPlusCents,
        /** What Stripe has paid out to the bank, all time: a transfer, not a sale. Null when Stripe was not read. */
        stripePaidOutCents,
        /** Net by month from Stripe's ledger, oldest first. Null unless Stripe stands in for RevenueCat. */
        stripeMonthly,
        source: realized.source,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
