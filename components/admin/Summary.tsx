"use client";

// The Summary: what replaced the hero row above Overview.
//
// Pinned tiles, one trend chart with an MRR / DAU toggle, and a 2-up under
// them. Every number the hero row showed is still here, and so are the
// routes it read: /api/admin/traffic at 90 days for visitors and sign-ups
// (sliced client-side so a window change costs no request), /api/admin/stats
// for today's counts and the live reader count, and the overview poll the
// shell already runs for revenue and paid subscribers. Two routes are new
// to this screen and both already exist for their own tabs: /api/admin/
// revenue for MRR and the shop's monthly ledger, /api/admin/catechism for
// today's attempts. No route changed shape.
//
// PINS. The tile set is per operator, in localStorage under
// purify.admin.pins, defaulting to the owner's six. Every tile the Summary
// knows how to draw is listed in TILES; the pinned ones render as tiles, the
// rest as rows in the "More" list so nothing is unreachable and any row can
// be pinned from there.
//
// THE PHONE. Below md the pinned set is a StatList, the chart is 160px, and
// the 2-up stacks. Both trees render and the breakpoint picks, the precedent
// DataTable set.
//
// MRR HAS NO DAILY HISTORY. Nothing in the tree records MRR per day, so the
// MRR side of the chart shows the current figure and says so rather than
// drawing the shop series under an MRR label. DAU is daily unique visitors,
// which is the closest daily count the traffic route keeps.

import { useMemo, useState } from "react";

import { useLiveData } from "@/lib/admin/useLiveData";
import { usePins } from "@/lib/admin/ledger/pins";
import type { DeltaSpec } from "@/lib/admin/ledger/delta";
import type { AttentionSummary } from "@/lib/admin/attention";
import { formatPrice } from "@/lib/shop/format";
import { KpiTile } from "./ledger/KpiTile";
import { MetricToggle } from "./ledger/MetricToggle";
import { PeriodBar, type PeriodId } from "./ledger/PeriodBar";
import { StatList, type StatRow } from "./ledger/StatList";
import { TrendChart } from "./ledger/TrendChart";
import { Card } from "./primitives";
import { WaitingCard } from "./WaitingCard";

type TrafficPoint = { date: string; visitors: number; views: number; signups: number };
type Traffic = { points: TrafficPoint[] };
type Stats = {
  liveCount: number | null;
  today: { visitors: number | null; views: number | null; signups: number | null };
};
type Revenue = {
  shop: { monthly: { month: string; netCents: number; grossCents: number }[] };
  subscriptions: { mrrCents: number; estimated: boolean };
};
type Catechism = { attempts: { today: number | null; total: number | null } };

const WINDOW: Record<PeriodId, number> = { "7d": 7, "30d": 30, "90d": 90, ytd: 90, custom: 30 };

const compact = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 10_000
      ? `${Math.round(n / 1000)}k`
      : n >= 1000
        ? `${(n / 1000).toFixed(1)}k`
        : String(Math.round(n));

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);

/** Percent change of the last `w` points' sum against the `w` before them. */
function deltaOver(series: number[], w: number): DeltaSpec | undefined {
  if (series.length < w * 2) return undefined;
  const cur = sum(series.slice(-w));
  const prev = sum(series.slice(-w * 2, -w));
  if (prev === 0) return undefined;
  return { value: ((cur - prev) / prev) * 100 };
}

/** "12 Aug" from a UTC bucket date. */
function dayLabel(d: string): string {
  const t = Date.parse(d + "T00:00:00Z");
  return Number.isNaN(t)
    ? d
    : new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

type TileSpec = {
  id: string;
  label: string;
  info?: string;
  value?: string | number | null;
  delta?: DeltaSpec;
  trend?: number[];
  sensitive?: boolean;
  loading?: boolean;
  error?: string;
  empty?: string;
  emptyHref?: { href: string; label: string };
  caption?: string;
  tab?: string;
};

export function Summary({
  onOpenTab,
  summary,
  onRetry,
  revenueSeries,
  revenueTodayCents,
  revenueMeasured,
  revenueLoading,
  paidSubscribers,
  pendingOrders,
  overviewSynced,
  overviewFailing,
  onRefreshOverview,
}: {
  onOpenTab: (id: string) => void;
  summary: AttentionSummary;
  onRetry: (url: string) => void;
  /** Daily net cents, oldest first, from the shell's overview poll. */
  revenueSeries: number[];
  revenueTodayCents: number | null;
  revenueMeasured: boolean;
  revenueLoading: boolean;
  /** paidPlus from the overview poll, null until it answers. */
  paidSubscribers: number | null;
  pendingOrders: number | null;
  overviewSynced: Date | null;
  overviewFailing: boolean;
  onRefreshOverview: () => void;
}) {
  const traffic = useLiveData<Traffic>("/api/admin/traffic?range=90d", 60_000);
  const stats = useLiveData<Stats>("/api/admin/stats", 20_000);
  const revenue = useLiveData<Revenue>("/api/admin/revenue", 60_000);
  const catechism = useLiveData<Catechism>("/api/admin/catechism", 60_000);

  const [period, setPeriod] = useState<PeriodId>("30d");
  const [compare, setCompare] = useState(false);
  const [metric, setMetric] = useState<"mrr" | "dau">("dau");
  const w = WINDOW[period];

  const points = traffic.data?.points;
  const visitors = useMemo(() => (points ?? []).map((p) => p.visitors), [points]);
  const signups = useMemo(() => (points ?? []).map((p) => p.signups), [points]);
  const dates = useMemo(() => (points ?? []).map((p) => p.date), [points]);
  const measured = traffic.data !== null;

  const tiles: TileSpec[] = useMemo(() => {
    const trafficErr = !traffic.loading && traffic.failing && !measured ? "Traffic did not answer." : undefined;
    const mrr = revenue.data?.subscriptions;
    const monthly = revenue.data?.shop.monthly ?? [];
    const last3 = monthly.slice(-3);
    const prev3 = monthly.slice(-6, -3);
    const shop90 = last3.length ? sum(last3.map((m) => m.netCents)) : null;
    const shopPrev = prev3.length ? sum(prev3.map((m) => m.netCents)) : 0;
    const catToday = catechism.data?.attempts.today;
    return [
      {
        id: "paid-subscribers",
        label: "Paid subscribers",
        info: "Active Plus and Pro entitlements, excluding comped accounts.",
        value: paidSubscribers,
        loading: paidSubscribers === null && revenueLoading,
        empty: "Not measured.",
        tab: "subscriptions",
      },
      {
        id: "mrr",
        label: "MRR",
        info: mrr?.estimated
          ? "List-price estimate: RevenueCat did not answer."
          : "Monthly recurring revenue from RevenueCat.",
        value: mrr ? formatPrice(mrr.mrrCents, "usd") : null,
        sensitive: true,
        loading: revenue.loading && !revenue.data,
        error: !revenue.loading && revenue.failing && !revenue.data ? "Revenue did not answer." : undefined,
        empty: "Not measured.",
        tab: "revenue",
      },
      {
        id: "visitors-30d",
        label: "Visitors 30d",
        info: "Unique visitors over the last 30 UTC days, against the 30 before.",
        value: measured ? compact(sum(visitors.slice(-30))) : null,
        delta: measured ? deltaOver(visitors, 30) : undefined,
        caption: "vs prior 30 days",
        trend: measured ? visitors.slice(-30) : undefined,
        loading: traffic.loading && !measured,
        error: trafficErr,
        empty: "Not measured.",
        tab: "traffic",
      },
      {
        id: "new-users-30d",
        label: "New users 30d",
        info: "Accounts created over the last 30 UTC days, against the 30 before.",
        value: measured ? compact(sum(signups.slice(-30))) : null,
        delta: measured ? deltaOver(signups, 30) : undefined,
        caption: "vs prior 30 days",
        trend: measured ? signups.slice(-30) : undefined,
        loading: traffic.loading && !measured,
        error: trafficErr,
        empty: "Not measured.",
        tab: "users",
      },
      {
        id: "catechism-today",
        label: "Catechism completions today",
        info: "Quiz attempts recorded today, UTC. Counts only, nobody is named.",
        value: catToday ?? null,
        loading: catechism.loading && !catechism.data,
        error: !catechism.loading && catechism.failing && !catechism.data ? "Catechism did not answer." : undefined,
        empty: catechism.data ? "No completions recorded yet." : "Not measured.",
        emptyHref: { href: "/admin#tab=catechism", label: "Open Catechism" },
        tab: "catechism",
      },
      {
        id: "shop-revenue-90d",
        label: "Shop revenue 90d",
        info: "Net shop revenue across the last three calendar months, the closest window the ledger keeps, against the three before.",
        value: shop90 === null ? null : money(shop90),
        delta: shop90 !== null && shopPrev > 0 ? { value: ((shop90 - shopPrev) / shopPrev) * 100 } : undefined,
        caption: "vs prior 3 months",
        trend: monthly.length > 1 ? monthly.slice(-6).map((m) => m.netCents) : undefined,
        sensitive: true,
        loading: revenue.loading && !revenue.data,
        error: !revenue.loading && revenue.failing && !revenue.data ? "Revenue did not answer." : undefined,
        empty: "No shop revenue recorded yet.",
        tab: "revenue",
      },
      {
        id: "revenue-30d",
        label: "Shop revenue 30d",
        info: "Net of refunds, shop orders only, last 30 UTC days.",
        value: revenueMeasured ? money(sum(revenueSeries.slice(-30))) : null,
        trend: revenueMeasured ? revenueSeries.slice(-30) : undefined,
        sensitive: true,
        loading: revenueLoading && !revenueMeasured,
        empty: "Not measured.",
        tab: "revenue",
      },
      {
        id: "revenue-today",
        label: "Revenue today",
        info: "Shop orders paid today, UTC, net of refunds.",
        value: revenueMeasured && revenueTodayCents !== null ? formatPrice(revenueTodayCents, "usd") : null,
        sensitive: true,
        loading: revenueLoading && !revenueMeasured,
        empty: "Not measured.",
        tab: "revenue",
      },
      {
        id: "visitors-today",
        label: "Visitors today",
        info: "Unique visitors in today's UTC bucket.",
        value: stats.data?.today.visitors ?? null,
        caption: visitors.length > 1 ? `yesterday ${visitors[visitors.length - 2]}` : undefined,
        loading: stats.loading && !stats.data,
        empty: "Not measured.",
        tab: "traffic",
      },
      {
        id: "signups-today",
        label: "New users today",
        info: "Accounts created in today's UTC bucket.",
        value: stats.data?.today.signups ?? null,
        caption: signups.length > 1 ? `yesterday ${signups[signups.length - 2]}` : undefined,
        loading: stats.loading && !stats.data,
        empty: "Not measured.",
        tab: "users",
      },
      {
        id: "reading-now",
        label: "Reading now",
        info: "Sessions seen in the last 90 seconds.",
        value: stats.data?.liveCount ?? null,
        loading: stats.loading && !stats.data,
        empty: "Not measured.",
        tab: "users",
      },
      {
        id: "awaiting-payment",
        label: "Awaiting payment",
        info: "Orders still pending at the last poll.",
        value: pendingOrders,
        loading: pendingOrders === null && revenueLoading,
        empty: "Not measured.",
        tab: "orders",
      },
    ];
  }, [
    traffic.loading, traffic.failing, measured, visitors, signups,
    revenue.data, revenue.loading, revenue.failing,
    catechism.data, catechism.loading, catechism.failing,
    stats.data, stats.loading,
    paidSubscribers, pendingOrders, revenueSeries, revenueTodayCents, revenueMeasured, revenueLoading,
  ]);

  const known = useMemo(() => tiles.map((t) => t.id), [tiles]);
  const [pins, togglePin] = usePins(known);
  const pinnedTiles = pins.map((id) => tiles.find((t) => t.id === id)).filter((t): t is TileSpec => !!t);
  const rest = tiles.filter((t) => !pins.includes(t.id));

  const toRow = (t: TileSpec): StatRow => ({
    id: t.id,
    label: t.label,
    value: t.loading ? null : t.value,
    delta: t.delta,
    trend: t.trend,
    sensitive: t.sensitive,
    onClick: t.tab ? () => onOpenTab(t.tab as string) : undefined,
  });

  // The chart. DAU is the visitors series over the chosen window, with the
  // window before it as the compare. MRR is the current figure and an
  // honest empty plot.
  const dauPoints = measured ? visitors.slice(-w) : [];
  const dauCompare = measured && compare && visitors.length >= w * 2 ? visitors.slice(-w * 2, -w) : undefined;
  const dauLabels = dates.slice(-w).map(dayLabel);
  const mrr = revenue.data?.subscriptions;

  return (
    <div className="mb-6">
      <div className="mb-3">
        <PeriodBar
          period={period}
          onPeriod={setPeriod}
          compare={compare}
          onCompare={setCompare}
          lastSynced={overviewSynced}
          failing={overviewFailing}
          onRefresh={onRefreshOverview}
        />
      </div>

      {/* The pinned set: tiles from md, a list below. */}
      <div className="hidden gap-3 md:grid md:grid-cols-3 xl:grid-cols-6">
        {pinnedTiles.map((t) => (
          <KpiTile
            key={t.id}
            label={t.label}
            info={t.info}
            value={t.value}
            delta={t.delta}
            trend={t.trend}
            sensitive={t.sensitive}
            loading={t.loading}
            error={t.error}
            empty={t.empty}
            emptyHref={t.emptyHref}
            caption={t.caption}
            pinned
            onPin={() => togglePin(t.id)}
          />
        ))}
        {pinnedTiles.length === 0 ? (
          <p className="col-span-full font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            Nothing is pinned. Pin a row from the list below.
          </p>
        ) : null}
      </div>
      <div className="md:hidden">
        <Card title="Summary">
          <StatList
            rows={pinnedTiles.map(toRow)}
            loading={pinnedTiles.length > 0 && pinnedTiles.every((t) => t.loading)}
            empty="Nothing is pinned."
            onPin={togglePin}
            pinned={pins}
          />
        </Card>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] lg:items-start">
        {metric === "dau" ? (
          <TrendChart
            title={`Daily active users, ${w} days`}
            value={measured && dauPoints.length ? compact(sum(dauPoints)) : null}
            delta={measured ? deltaOver(visitors, w) : undefined}
            points={dauPoints}
            labels={dauLabels}
            compare={dauCompare}
            compareLabel="prior"
            format={compact}
            loading={traffic.loading && !measured}
            error={!traffic.loading && traffic.failing && !measured ? "Traffic did not answer." : undefined}
            empty="No visitors recorded in this window."
            action={<MetricToggle value={metric} onChange={setMetric} />}
          />
        ) : (
          <TrendChart
            title="MRR"
            value={mrr ? formatPrice(mrr.mrrCents, "usd") : null}
            points={[]}
            sensitive
            loading={revenue.loading && !revenue.data}
            error={!revenue.loading && revenue.failing && !revenue.data ? "Revenue did not answer." : undefined}
            empty="No daily MRR history is recorded yet. The figure above is the current run rate."
            emptyHref={{ href: "/admin#tab=subscriptions", label: "Open Subscriptions" }}
            action={<MetricToggle value={metric} onChange={setMetric} />}
          />
        )}
        <WaitingCard summary={summary} onOpenTab={onOpenTab} onRetry={onRetry} />
      </div>

      {/* The 2-up: today, and everything not pinned. */}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Card title="Today" subtitle="UTC day">
          <StatList
            rows={tiles
              .filter((t) => ["visitors-today", "signups-today", "revenue-today", "reading-now", "awaiting-payment"].includes(t.id))
              .map(toRow)}
          />
        </Card>
        <Card title="More" subtitle="Pin a row to move it up">
          <StatList rows={rest.map(toRow)} onPin={togglePin} empty="Everything is pinned." />
        </Card>
      </div>
    </div>
  );
}

