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

import { useLiveData } from "@/lib/admin/useLiveData";
import { Card, KpiCard, ChartFrame } from "../primitives";
import { LineChart, CalendarHeatmap, SERIES_COLORS, chartColors } from "../charts";

type Stats = {
  /* null means the read failed, not that the number is zero. The stats
     route binds its errors and sends null rather than coalescing to 0,
     so a dead database reads as a dash instead of a dead site. */
  liveCount: number | null;
  today: { visitors: number | null; views: number | null; signups: number | null };
  totalUsers: number | null;
  totalBumps: number | null;
  generatedAt: string;
};

type Totals = {
  // Nullable, because /api/admin/totals now sends null for a count it could
  // not read rather than 0. The `?? "—"` at each KpiCard below was already
  // written for it; the type was the part that said this could not happen.
  lifetimeVisitors: number | null;
  lifetimePageviews: number | null;
  lifetimeSignups: number | null;
  lifetimeBumps: number | null;
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
      <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 w-[220px] rounded-[var(--adm-radius)] border border-paper/15 bg-night p-2 font-sans text-eyebrow text-paper/85 leading-snug opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10 shadow">
        Sum of the last 14 calendar days. At every UTC midnight, the oldest
        day rolls off and a fresh day (starts at 0) enters — so this number
        can drop. The lifetime counters above never do.
      </span>
    </span>
  );
}

export function OverviewTab() {
  // Three independent reads, each on useLiveData rather than one hand-rolled
  // interval over a Promise.all. Independence was already the intent here (one
  // failing must not blank the other two) and the hook keeps that: adminJson
  // returns null on a non-ok body, and each hook holds its own last good value
  // instead of storing an error body that would throw later during render at
  // stats.today.visitors.
  //
  // What changes is that all three stop when the tab is hidden. This panel
  // polls three endpoints every ten seconds, and two of them are expensive:
  // /api/admin/stats reads tens of thousands of analytics rows and
  // /api/admin/totals runs four unfiltered exact COUNTs on the two largest
  // tables. Unpaused, that is eighteen authenticated requests a minute against
  // the same Render service that serves purifyapp.net to the public, all night
  // if a window is left open.
  const { data: stats } = useLiveData<Stats>("/api/admin/stats", 10_000);
  // 60s, not 10. Lifetime totals are the slowest-moving numbers on the panel
  // and the most expensive to produce: four unfiltered exact COUNTs, no date
  // filter, on the two largest tables. Six times a minute bought nothing a
  // reader could see, because a lifetime count does not visibly move in ten
  // seconds. The route sends `private, max-age=60` hoping the browser would
  // absorb the difference, but adminJson fetches with cache: "no-store" and so
  // never consults that cache: every one of those polls reached Postgres. The
  // interval is now the bound the header was pretending to be.
  const { data: totals } = useLiveData<Totals>("/api/admin/totals", 60_000);
  const { data: trafficRes } = useLiveData<{ points?: TrafficPoint[] }>(
    "/api/admin/traffic?range=90d",
    10_000,
  );
  const traffic = trafficRes?.points ?? [];

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
          <p className="font-sans text-detail font-medium text-[color:var(--adm-ink-3)]">
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
          <p className="font-sans text-detail font-medium text-[color:var(--adm-ink-3)]">
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
            <p className="text-caption font-medium text-[color:var(--adm-ink-3)]">Visitors</p>
            <p className="mt-1 text-title font-bold tabular-nums text-paper">
              {stats?.today.visitors ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-caption font-medium text-[color:var(--adm-ink-3)]">Pageviews</p>
            <p className="mt-1 text-title font-bold tabular-nums text-paper">
              {stats?.today.views ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-caption font-medium text-[color:var(--adm-ink-3)]">Signups</p>
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
