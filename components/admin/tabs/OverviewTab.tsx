"use client";

// Overview tab — landing screen.
//
// Hero row: LIFETIME cumulative counts (Visitors, Pageviews, Signups, Bumps).
//           These only ever grow. The number a user sees on this row never
//           shrinks between refreshes, period.
//
// Trend row: rolling 14-day window — sparkline + delta + the literal label
//            "last 14 days (rolling)" with an ⓘ tooltip explaining that the
//            count can drop when an old high-traffic day rolls off the
//            window's left edge.
//
// Below: a 30-day LineChart (responsive now), and a 12-week calendar
//        heatmap showing per-day pageviews — the most honest answer to
//        "is this counting accurately?" because every day is its own cell.

import { useEffect, useState } from "react";
import { Card, KpiCard, ChartFrame } from "../primitives";
import { LineChart, CalendarHeatmap, SERIES_COLORS, chartColors } from "../charts";

type Stats = {
  liveCount: number;
  today: { visitors: number; views: number; signups: number };
  totalUsers: number;
  totalBumps: number;
  generatedAt: string;
};

type Totals = {
  lifetimeVisitors: number;
  lifetimePageviews: number;
  lifetimeSignups: number;
  lifetimeBumps: number;
  oldestSessionAt: string | null;
  oldestPageviewAt: string | null;
  oldestProfileAt: string | null;
};

type TrafficPoint = {
  date: string;
  visitors: number;
  views: number;
  signups: number;
};

function pctDelta(curr: number, prior: number): { value: number; positive: boolean } {
  if (prior === 0) return { value: curr > 0 ? 100 : 0, positive: curr >= 0 };
  const d = ((curr - prior) / prior) * 100;
  return { value: Math.round(Math.abs(d)), positive: d >= 0 };
}

function ymd(iso: string | null): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

// Small ⓘ that shows a tooltip on hover/focus. Tooltip explains the
// rolling-window semantics so a drop reads as expected math not data loss.
function RollingInfo() {
  return (
    <span className="group relative inline-flex items-center align-middle ml-1">
      <button
        type="button"
        aria-label="What does 'rolling' mean?"
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-paper/30 text-paper/55 text-eyebrow font-bold leading-none cursor-help focus:outline-none focus:ring-1 focus:ring-gold"
      >
        i
      </button>
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 w-[220px] rounded-md border border-paper/15 bg-night p-2 font-sans text-eyebrow text-paper/85 leading-snug opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10 shadow">
        Sum of the last 14 calendar days. At every UTC midnight, the oldest
        day rolls off and a fresh day (starts at 0) enters — so this number
        can drop. The lifetime counters above never do.
      </span>
    </span>
  );
}

export function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [traffic, setTraffic] = useState<TrafficPoint[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [s, t, totalsRes] = await Promise.all([
          fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/admin/traffic?range=90d", { cache: "no-store" }).then((r) =>
            r.json(),
          ),
          fetch("/api/admin/totals", { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (!alive) return;
        setStats(s);
        setTraffic(t.points ?? []);
        setTotals(totalsRes);
      } catch {
        /* ignore */
      }
    }
    load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Pull the last 30 days for the trend chart and the trailing 14 (and
  // prior 14) for the rolling KPIs.
  const last30 = traffic.slice(-30);
  const last14 = traffic.slice(-14);
  const prior14 = traffic.slice(-28, -14);
  const sum = (arr: TrafficPoint[], k: keyof TrafficPoint) =>
    arr.reduce((a, p) => a + (typeof p[k] === "number" ? (p[k] as number) : 0), 0);

  return (
    <div className="space-y-6">
      {/* Hero — lifetime cumulative. These only grow. */}
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55">
            Lifetime
          </p>
          {totals?.oldestSessionAt && (
            <p className="font-sans text-eyebrow text-paper/40 tabular-nums">
              data since {ymd(totals.oldestSessionAt)}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Live now"
            value={stats?.liveCount ?? "—"}
            accent
            subtitle="sessions in last 90s"
          />
          <KpiCard
            label="Visitors"
            value={totals?.lifetimeVisitors ?? "—"}
            subtitle={`since ${ymd(totals?.oldestSessionAt ?? null)}`}
          />
          <KpiCard
            label="Pageviews"
            value={totals?.lifetimePageviews ?? "—"}
            subtitle={`since ${ymd(totals?.oldestPageviewAt ?? null)}`}
          />
          <KpiCard
            label="Signups"
            value={totals?.lifetimeSignups ?? "—"}
            subtitle={`since ${ymd(totals?.oldestProfileAt ?? null)}`}
          />
        </div>
      </div>

      {/* Trend — rolling 14d. Labeled honestly. */}
      <div>
        <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55">
            Rolling 14-day window
            <RollingInfo />
          </p>
          <p className="font-sans text-eyebrow text-paper/40">
            vs. prior 14 days
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Visitors · 14d"
            value={sum(last14, "visitors")}
            trend={last14.map((p) => p.visitors)}
            delta={pctDelta(sum(last14, "visitors"), sum(prior14, "visitors"))}
            subtitle="rolling"
          />
          <KpiCard
            label="Pageviews · 14d"
            value={sum(last14, "views")}
            trend={last14.map((p) => p.views)}
            delta={pctDelta(sum(last14, "views"), sum(prior14, "views"))}
            subtitle="rolling"
          />
          <KpiCard
            label="Signups · 14d"
            value={sum(last14, "signups")}
            trend={last14.map((p) => p.signups)}
            delta={pctDelta(sum(last14, "signups"), sum(prior14, "signups"))}
            subtitle="rolling"
          />
          <KpiCard
            label="Bumps · lifetime"
            value={totals?.lifetimeBumps ?? stats?.totalBumps ?? "—"}
            accent
            subtitle="never resets"
          />
        </div>
      </div>

      {/* Today snapshot — small read-out so the operator can see the day so far. */}
      <Card title="Today so far · UTC">
        <div className="grid grid-cols-3 gap-4 font-sans">
          <div>
            <p className="text-eyebrow uppercase tracking-[1.2px] text-paper/45">Visitors</p>
            <p className="mt-1 text-title font-bold tabular-nums text-paper">
              {stats?.today.visitors ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-eyebrow uppercase tracking-[1.2px] text-paper/45">Pageviews</p>
            <p className="mt-1 text-title font-bold tabular-nums text-paper">
              {stats?.today.views ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-eyebrow uppercase tracking-[1.2px] text-paper/45">Signups</p>
            <p className="mt-1 text-title font-bold tabular-nums text-paper">
              {stats?.today.signups ?? "—"}
            </p>
          </div>
        </div>
      </Card>

      {/* 30-day trend */}
      <ChartFrame
        title="Traffic · last 30 days"
        subtitle="Hover the chart to inspect a single day."
        isEmpty={last30.length === 0}
      >
        <LineChart
          labels={last30.map((p) => p.date.slice(5))}
          series={[
            {
              name: "Visitors",
              color: SERIES_COLORS[0],
              data: last30.map((p) => p.visitors),
            },
            {
              name: "Pageviews",
              color: SERIES_COLORS[1],
              data: last30.map((p) => p.views),
            },
            {
              name: "Signups",
              color: SERIES_COLORS[3],
              data: last30.map((p) => p.signups),
            },
          ]}
        />
      </ChartFrame>

      {/* 12-week calendar heatmap of pageviews. This is the visualization
          the user really wants when they're asking 'is the count accurate
          over time' — every day is its own cell, no window math. */}
      <ChartFrame
        title="Pageviews · 12-week calendar"
        subtitle="Each square is one day. Darker = more views. Hover for the exact count."
        isEmpty={traffic.length === 0}
      >
        <CalendarHeatmap
          data={traffic.map((p) => ({ date: p.date, value: p.views }))}
          weeks={12}
          accent={chartColors.primary}
        />
      </ChartFrame>
    </div>
  );
}
