"use client";

// Revenue — unified money view. Shop revenue (net of refunds, reusing the
// pure earnings aggregators server-side), donations, and an ESTIMATED
// subscription run-rate, with a monthly trend, a revenue-by-source donut,
// and top products. A sub-tab holds the existing costs/sustainability UI.

import { useEffect, useState } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { Card, StatCard, ChartFrame, SubTabs } from "../primitives";
import { AreaChart, BarChart, Donut, SERIES_COLORS, chartColors } from "../charts";
import { formatPrice } from "@/lib/shop/format";
import { SustainabilityTab } from "./SustainabilityTab";

type Revenue = {
  shop: {
    grossCents: number;
    netCents: number;
    refundedCents: number;
    averageOrderCents: number;
    refundRate: number;
    paidOrderCount: number;
    unitsSold: number;
    monthly: { month: string; netCents: number; grossCents: number }[];
    topProducts: { title: string; units: number; grossCents: number }[];
  };
  donations: { totalCents: number };
  subscriptions: {
    mrrCents: number;
    arrCents: number;
    activePlus: number;
    activePro: number;
    estimated: boolean;
  };
  bySource: { name: string; value: number }[];
};

function money(cents: number) {
  return formatPrice(cents, "usd");
}

function RevenuePanel() {
  const [data, setData] = useState<Revenue | null>(null);

  useEffect(() => {
    let alive = true;
    adminJson<Revenue>("/api/admin/revenue").then((d) => {
      if (alive && d) setData(d);
    });
    return () => {
      alive = false;
    };
  }, []);

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Shop net"
          value={data ? money(data.shop.netCents) : "—"}
          accent
          hint="paid minus refunds"
        />
        <StatCard
          label="Avg order"
          value={data ? money(data.shop.averageOrderCents) : "—"}
          hint={data ? `${data.shop.paidOrderCount} paid` : undefined}
        />
        <StatCard
          label="Donations"
          value={data ? money(data.donations.totalCents) : "—"}
          hint="all-time"
        />
        <StatCard
          label="Subs MRR · est."
          value={data ? money(data.subscriptions.mrrCents) : "—"}
          hint={
            data
              ? `${data.subscriptions.activePlus} Plus · ${data.subscriptions.activePro} Pro`
              : undefined
          }
        />
      </div>

      <p className="font-sans text-eyebrow text-paper/40">
        Subscription revenue is estimated (active subscribers × list monthly
        price); no billed amount is stored. Shop and donation figures are
        realized.
      </p>

      <ChartFrame
        title="Shop net revenue · by month"
        subtitle="Paid orders minus refunds."
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
          title="Revenue by source"
          subtitle="Shop net + donations (realized) and subscriptions (est. annual)."
          isEmpty={donutSegments.length === 0}
        >
          <div className="flex justify-center">
            <Donut segments={donutSegments} size={200} label="USD" />
          </div>
        </ChartFrame>

        <ChartFrame
          title="Top products"
          subtitle="By gross across paid orders."
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

      <Card title="Estimated subscription run-rate">
        <div className="grid grid-cols-2 gap-4 font-sans">
          <div>
            <p className="text-eyebrow uppercase tracking-[1.2px] text-paper/45">
              MRR (est.)
            </p>
            <p className="mt-1 text-title font-bold tabular-nums text-paper">
              {data ? money(data.subscriptions.mrrCents) : "—"}
            </p>
          </div>
          <div>
            <p className="text-eyebrow uppercase tracking-[1.2px] text-paper/45">
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

type Panel = "revenue" | "costs";
const TABS = [
  ["revenue", "Revenue"],
  ["costs", "Costs & sustainability"],
] as const;

export function RevenueTab() {
  const [panel, setPanel] = useState<Panel>("revenue");
  return (
    <div className="space-y-5">
      <SubTabs tabs={TABS} active={panel} onChange={setPanel} />
      {panel === "revenue" ? <RevenuePanel /> : <SustainabilityTab />}
    </div>
  );
}
