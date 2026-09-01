"use client";

// Revenue — unified money view. Shop revenue (net of refunds, reusing the
// pure earnings aggregators server-side), donations, and an ESTIMATED
// subscription run-rate, with a monthly trend, a revenue-by-source donut,
// and top products. A sub-tab holds the existing costs/sustainability UI.

import { useLiveData } from "@/lib/admin/useLiveData";
import { Freshness } from "../Freshness";
import { Card, StatCard, ChartFrame } from "../primitives";
import { AreaChart, BarChart, Donut, SERIES_COLORS, chartColors } from "../charts";
import { formatPrice } from "@/lib/shop/format";
import { ReconcileCard } from "../ReconcileCard";

type Revenue = {
  shop: {
    grossCents: number;
    netCents: number;
    refundedCents: number;
    averageOrderCents: number;
    refundRate: number;
    paidOrderCount: number;
    keptOrderCount: number;
    refundedOrderCount: number;
    pendingOrderCount: number;
    cancelledOrderCount: number;
    unitsSold: number;
    monthly: { month: string; netCents: number; grossCents: number }[];
    topProducts: { title: string; units: number; grossCents: number }[];
  };
  donations: {
    totalCents: number;
    /** False when donations_monthly has no rows: unmeasured, not zero. */
    recorded: boolean;
  };
  subscriptions: {
    mrrCents: number;
    arrCents: number;
    activePlus: number;
    activePro: number;
    /** True only when RevenueCat did not answer and the list-price maths did. */
    estimated: boolean;
    /** The list-price figure, kept even when the real one is present. */
    estimatedMrrCents: number;
    source: "revenuecat" | "list-price-estimate";
    live: {
      activeSubscriptions: number;
      activeTrials: number;
      totalRevenue: number;
      currency: string;
      lastUpdatedAt: string | null;
      annualArpu: number | null;
    } | null;
  };
  bySource: { name: string; value: number }[];
  realized: {
    totalCents: number;
    complete: boolean;
    shopCents: number;
    donationsCents: number;
    subscriptionsCents: number | null;
  };
};

function money(cents: number) {
  return formatPrice(cents, "usd");
}

function RevenuePanel() {
  // 60s, matching the server-side cache in lib/billing/revenuecatMetrics.ts.
  // Polling faster would only re-serve the same bytes while spending against
  // RevenueCat's 25-requests-a-minute budget, and the hook pauses entirely
  // while the tab is hidden so an open window overnight costs nothing.
  const { data, lastSynced, failing, refresh } = useLiveData<Revenue>(
    "/api/admin/revenue",
    60_000,
  );

  const monthly = (data?.shop.monthly ?? []).slice().reverse(); // oldest → newest
  const donutSegments = (data?.bySource ?? [])
    .filter((s) => s.value > 0)
    .map((s, i) => ({
      name: s.name,
      value: Math.round(s.value / 100),
      color: SERIES_COLORS[i % SERIES_COLORS.length],
    }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Freshness lastSynced={lastSynced} failing={failing} onRefresh={refresh} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          // The figure the panel never had. Every card here reported one
          // stream, and the estimate shouted loudest, so there was no line
          // anywhere saying what the business has actually been paid.
          label={data?.realized.complete ? "Realized revenue" : "Realized · partial"}
          value={data ? money(data.realized.totalCents) : "—"}
          accent
          hint={
            data
              ? data.realized.complete
                ? "shop + donations + subscriptions"
                : data.realized.subscriptionsCents == null
                  ? "shop + donations; subscriptions not connected"
                  : "shop + subscriptions; donations never recorded"
              : undefined
          }
        />
        <StatCard
          label="Shop net"
          value={data ? money(data.shop.netCents) : "—"}
          hint="paid minus refunds"
        />
        <StatCard
          label="Avg order"
          value={data ? money(data.shop.averageOrderCents) : "—"}
          // The pipeline, not just the takings. On production this reads
          // "0 paid, 24 pending, 16 cancelled": people reach checkout and
          // none of them finish. A bare $0 looked like no demand, which is
          // the opposite diagnosis and the opposite fix.
          hint={
            data
              ? // keptOrderCount, not paidOrderCount. The latter counts an
                // order that was paid and then refunded, so a shop with one
                // sale and one refund of it used to report "2 paid".
                `${data.shop.keptOrderCount} paid · ${data.shop.pendingOrderCount} pending · ${data.shop.cancelledOrderCount} cancelled${data.shop.refundedOrderCount > 0 ? ` · ${data.shop.refundedOrderCount} refunded` : ""}`
              : undefined
          }
        />
        <StatCard
          label="Donations"
          // NOT MEASURED IS NOT ZERO. donations_monthly is a manual snapshot
          // table with no rows on production, so a bare $0 claimed donations
          // came in and totalled nothing. They were never recorded at all.
          value={
            data ? (data.donations.recorded ? money(data.donations.totalCents) : "Not recorded") : "—"
          }
          hint={data && !data.donations.recorded ? "no snapshot yet" : "all-time"}
        />
        <StatCard
          label={data && !data.subscriptions.estimated ? "Subs MRR · real" : "Subs MRR · est."}
          value={data ? money(data.subscriptions.mrrCents) : "—"}
          hint={
            data
              ? `${data.subscriptions.activePlus} Plus · ${data.subscriptions.activePro} Pro`
              : undefined
          }
        />
      </div>

      {/* The label is the point. Until RevenueCat is wired this panel could
          only multiply subscribers by a list price, which cannot see a
          discount, a regional tier, an annual plan or store commission. Where
          the real figure is available it says so, and it keeps the estimate
          beside it so the gap between the two stays visible rather than being
          quietly resolved. */}
      {data && !data.subscriptions.estimated ? (
        <p className="font-sans text-eyebrow text-paper/40">
          Subscription revenue is real, from RevenueCat
          {data.subscriptions.live?.lastUpdatedAt
            ? `, as of ${new Date(data.subscriptions.live.lastUpdatedAt).toLocaleString()}`
            : ""}
          . List price alone would have implied{" "}
          {money(data.subscriptions.estimatedMrrCents)}; the difference is
          discounts, regional pricing, annual plans and store commission.
          {data.subscriptions.live?.annualArpu != null
            ? ` Real revenue per subscriber: ${money(Math.round(data.subscriptions.live.annualArpu * 100))} a year.`
            : ""}
        </p>
      ) : (
        <p className="font-sans text-eyebrow text-paper/40">
          Subscription revenue is estimated (active subscribers × list monthly
          price); no billed amount is stored. Set REVENUECAT_V2_API_KEY and
          REVENUECAT_PROJECT_ID to replace this with billed figures. Shop and
          donation figures are realized.
        </p>
      )}

      {/* Above the charts, because a chart of revenue that is missing money
          Stripe already took is the wrong thing to look at first. */}
      <ReconcileCard />

      <ChartFrame
        title="Shop net revenue · by month"
        subtitle="Paid orders minus refunds."
        sensitive
        isEmpty={monthly.length === 0}
        empty="No shop revenue yet."
      >
        <AreaChart
          labels={monthly.map((m) => m.month.slice(2))}
          series={[
            {
              name: "Net",
              color: SERIES_COLORS[0],
              data: monthly.map((m) => Math.round(m.netCents / 100)),
            },
          ]}
        />
      </ChartFrame>

      <div className="grid gap-6 md:grid-cols-2">
        <ChartFrame
          title="Realized revenue by source"
          // The subtitle is load-bearing. This chart used to put a twelve-month
          // forward ARR projection in the same circle as realized cash, which
          // on a shop that has never taken a payment rendered as one full ring
          // of a forecast.
          subtitle={
            data && data.realized.subscriptionsCents == null
              ? "Money actually received. Subscriptions are excluded: RevenueCat is not connected, so what they earned cannot be read."
              : "Money actually received. The subscription run-rate estimate is not in here; it is in the card below."
          }
          isEmpty={donutSegments.length === 0}
          empty="Nothing realized yet."
          sensitive
        >
          <div className="flex justify-center">
            <Donut segments={donutSegments} size={200} label="USD" />
          </div>
        </ChartFrame>

        <ChartFrame
          title="Top products"
          subtitle="By gross across paid orders."
          sensitive
          isEmpty={(data?.shop.topProducts ?? []).length === 0}
        >
          <BarChart
            rows={(data?.shop.topProducts ?? []).map((p) => ({
              label: p.title,
              value: Math.round(p.grossCents / 100),
            }))}
            accent={chartColors.accent}
          />
        </ChartFrame>
      </div>

      <Card title={data && !data.subscriptions.estimated ? "Subscription run-rate" : "Estimated subscription run-rate"}>
        <div className="grid grid-cols-2 gap-4 font-sans">
          <div>
            <p className="text-caption font-medium text-[color:var(--adm-ink-3)]">
              MRR (est.)
            </p>
            <p className="mt-1 text-title font-bold tabular-nums text-paper">
              {data ? money(data.subscriptions.mrrCents) : "—"}
            </p>
          </div>
          <div>
            <p className="text-caption font-medium text-[color:var(--adm-ink-3)]">
              ARR (est.)
            </p>
            <p className="mt-1 text-title font-bold tabular-nums text-paper">
              {data ? money(data.subscriptions.arrCents) : "—"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Costs used to live here as a second sub-tab, which is why the owner could
// not find the one screen in the panel that edits what Purify spends and what
// the public /support page publishes. It is its own rail entry now. Revenue is
// money coming in; Costs is money going out. They are not the same question and
// they should not be behind the same click.
export function RevenueTab() {
  return <RevenuePanel />;
}
