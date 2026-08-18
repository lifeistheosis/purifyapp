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
  ordersPaid: number;
  ordersPending: number;
  ordersCancelled: number;
  newUsers30: number;
  paidPlus: number;
  paidPro: number;
  comped: number;
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
        // r.ok is load-bearing, not defensive noise. Without it a 403 or 500
        // body ({ error: "Forbidden" }) was stored as if it were an Overview,
        // and the first read of data.recent.length threw. That TypeError
        // escaped to the route error boundary and replaced the WHOLE admin
        // panel with "Something went wrong", so one expired session took out
        // every other tab too. AdminShell's own badge fetch already guards
        // this way; this one did not.
        const r = await fetch("/api/admin/overview", { cache: "no-store" });
        const d = r.ok ? ((await r.json()) as Overview) : null;
        // Keep the last good numbers on a failed poll rather than blanking a
        // working dashboard, same posture as the rail badge.
        if (alive && d) setData(d);
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
        {/* Sentence case, not tracked uppercase. primitives.tsx states the
            rule: when everything is a heading, the eye has nothing to skip
            to. These two were the last uppercase eyebrows on the screen. */}
        <h2
          className="mb-3 font-sans text-[13px] font-medium"
          style={{ color: "var(--adm-ink-3)" }}
        >
          At a glance
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Revenue · 30 days"
            value={data ? money(data.revenue30Cents) : "…"}
            trend={series.length > 1 ? series : undefined}
            accent
            subtitle="paid, net of refunds"
          />
          <KpiCard
            label="Revenue · today"
            value={data ? money(data.revenueTodayCents) : "…"}
            subtitle="UTC day"
          />
          <KpiCard
            label="Orders · paid"
            value={data?.ordersPaid ?? "…"}
            hint={
              data
                ? `${data.ordersPending} pending · ${data.ordersCancelled} cancelled`
                : undefined
            }
          />
          <KpiCard
            label="New users · 30d"
            value={data?.newUsers30 ?? "…"}
            subtitle="profiles joined"
          />
        </div>
      </div>

      <div>
        {/* Sentence case, not tracked uppercase. primitives.tsx states the
            rule: when everything is a heading, the eye has nothing to skip
            to. These two were the last uppercase eyebrows on the screen. */}
        <h2
          className="mb-3 font-sans text-[13px] font-medium"
          style={{ color: "var(--adm-ink-3)" }}
        >
          Subscribers
        </h2>
        {/* Three cards, three columns. This row inherited the four-column
            grid from the row above, so the last cell sat empty and the three
            cards read as a broken four. */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <KpiCard
            label="Paid Plus"
            value={data?.paidPlus ?? "…"}
            accent
            subtitle="paying, incl. Pro"
          />
          <KpiCard
            label="Paid Pro"
            value={data?.paidPro ?? "…"}
            subtitle="members tier"
          />
          <KpiCard
            label="Comped"
            value={data?.comped ?? "…"}
            subtitle="complimentary"
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
        {data?.recent && data.recent.length > 0 ? (
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
