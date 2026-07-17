"use client";

// Commerce Overview — the money-and-accounts landing screen. Realized shop
// revenue (paid, net of refunds), order counts, active subscribers, new
// users, a 30-day net-revenue trend, and a recent paid-orders strip.

import { useEffect, useState } from "react";
import { Card, KpiCard, ChartFrame } from "../primitives";
import { AreaChart, SERIES_COLORS } from "../charts";
import { formatPrice } from "@/lib/shop/format";

type Overview = {
  revenueTodayCents: number;
  revenue30Cents: number;
  revenueSeries: number[];
  ordersTotal: number;
  ordersPending: number;
  newUsers30: number;
  activePlus: number;
  activePro: number;
  recent: {
    id: string;
    email: string | null;
    totalCents: number;
    createdAt: string;
  }[];
};

function money(cents: number): string {
  return formatPrice(cents, "usd");
}

function ago(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3_600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function CommerceOverviewTab() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const d = await fetch("/api/admin/overview", { cache: "no-store" }).then(
          (r) => r.json(),
        );
        if (alive) setData(d);
      } catch {
        /* ignore */
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const series = data?.revenueSeries ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
          At a glance
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Revenue · 30 days"
            value={data ? money(data.revenue30Cents) : "—"}
            trend={series.length > 1 ? series : undefined}
            accent
            subtitle="paid, net of refunds"
          />
          <KpiCard
            label="Revenue · today"
            value={data ? money(data.revenueTodayCents) : "—"}
            subtitle="UTC day"
          />
          <KpiCard
            label="Orders"
            value={data?.ordersTotal ?? "—"}
            hint={
              data
                ? `${data.ordersPending} pending`
                : undefined
            }
          />
          <KpiCard
            label="New users · 30d"
            value={data?.newUsers30 ?? "—"}
            subtitle="profiles joined"
          />
        </div>
      </div>

      <div>
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
          Subscribers
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Active Plus"
            value={data?.activePlus ?? "—"}
            accent
            subtitle="includes Pro"
          />
          <KpiCard
            label="Active Pro"
            value={data?.activePro ?? "—"}
            subtitle="members tier"
          />
        </div>
      </div>

      <ChartFrame
        title="Net revenue · last 30 days"
        subtitle="Paid orders minus refunds, by UTC day."
        isEmpty={series.every((v) => v === 0)}
        empty="No revenue in the last 30 days."
      >
        <AreaChart
          labels={series.map((_, i) => `${30 - i}d`)}
          series={[
            {
              name: "Net revenue",
              color: SERIES_COLORS[0],
              data: series.map((c) => Math.round(c / 100)),
            },
          ]}
        />
      </ChartFrame>

      <Card title="Recent paid orders">
        {data && data.recent.length > 0 ? (
          <ul className="divide-y divide-paper/[0.06]">
            {data.recent.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 py-2.5 font-sans text-detail"
              >
                <span className="text-paper/85 truncate">
                  {o.email ?? "Guest"}
                </span>
                <span className="flex items-center gap-3 shrink-0 tabular-nums">
                  <span className="text-paper font-semibold">
                    {money(o.totalCents)}
                  </span>
                  <span className="text-paper/40">{ago(o.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-sans text-detail text-paper/40 py-6 text-center">
            No paid orders yet.
          </p>
        )}
      </Card>
    </div>
  );
}
