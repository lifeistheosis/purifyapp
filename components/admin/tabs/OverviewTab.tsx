"use client";

// Overview tab — landing screen. KPI strip with sparklines from the
// 30-day traffic series, plus a quick read of "what's hot" right now.

import { useEffect, useState } from "react";
import { KpiCard } from "../primitives";
import { LineChart, SERIES_COLORS } from "../charts";
import { Card } from "../primitives";

type Stats = {
  liveCount: number;
  today: { visitors: number; views: number; signups: number };
  totalUsers: number;
  totalBumps: number;
  generatedAt: string;
};

type TrafficPoint = { date: string; visitors: number; views: number; signups: number };

function pctDelta(curr: number, prior: number): { value: number; positive: boolean } {
  if (prior === 0) return { value: curr > 0 ? 100 : 0, positive: curr >= 0 };
  const d = ((curr - prior) / prior) * 100;
  return { value: Math.round(Math.abs(d)), positive: d >= 0 };
}

export function OverviewTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [traffic, setTraffic] = useState<TrafficPoint[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [s, t] = await Promise.all([
          fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/admin/traffic?range=30d", { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (!alive) return;
        setStats(s);
        setTraffic(t.points ?? []);
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

  // Sparkline data (last 14 days) + delta vs prior 14.
  const last14 = traffic.slice(-14);
  const prior14 = traffic.slice(-28, -14);
  const sum = (arr: TrafficPoint[], k: keyof TrafficPoint) =>
    arr.reduce((a, p) => a + (typeof p[k] === "number" ? (p[k] as number) : 0), 0);

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Live now"
          value={stats?.liveCount ?? "—"}
          accent
        />
        <KpiCard
          label="Visitors · 14d"
          value={sum(last14, "visitors")}
          trend={last14.map((p) => p.visitors)}
          delta={pctDelta(sum(last14, "visitors"), sum(prior14, "visitors"))}
        />
        <KpiCard
          label="Pageviews · 14d"
          value={sum(last14, "views")}
          trend={last14.map((p) => p.views)}
          delta={pctDelta(sum(last14, "views"), sum(prior14, "views"))}
        />
        <KpiCard
          label="Signups · 14d"
          value={sum(last14, "signups")}
          trend={last14.map((p) => p.signups)}
          delta={pctDelta(sum(last14, "signups"), sum(prior14, "signups"))}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total users" value={stats?.totalUsers ?? "—"} />
        <KpiCard label="Total bumps" value={stats?.totalBumps ?? "—"} accent />
        <KpiCard label="Today · visitors" value={stats?.today.visitors ?? "—"} />
        <KpiCard label="Today · pageviews" value={stats?.today.views ?? "—"} />
      </div>

      {/* 30-day trend chart */}
      <Card title="Traffic, last 30 days" subtitle="Hover the chart to inspect a day.">
        <LineChart
          labels={traffic.map((p) => p.date.slice(5))}
          series={[
            {
              name: "Visitors",
              color: SERIES_COLORS[0],
              data: traffic.map((p) => p.visitors),
            },
            {
              name: "Pageviews",
              color: SERIES_COLORS[1],
              data: traffic.map((p) => p.views),
            },
            {
              name: "Signups",
              color: SERIES_COLORS[3],
              data: traffic.map((p) => p.signups),
            },
          ]}
        />
      </Card>
    </div>
  );
}
