"use client";

// The numbers and the one action, above Overview.
//
// ONE POLLER, FOUR CARDS. Visitors and New users both come out of
// /api/admin/traffic, which returns daily buckets carrying visitors, views
// and signups together, so two cards share one request. Revenue comes from
// /api/admin/overview, which this component does NOT fetch: AdminShell
// already polls it for the rail's live rows and the orders badge, and hands
// the series down. The phone's Today tiles read /api/admin/stats, which the
// activity feed already polls at 20s, so that too is a second subscriber to a
// request already in flight rather than a new one.
//
// WINDOWS ARE SLICED, NOT REFETCHED. Traffic is fetched once at 90 days and
// the period chips cut into that array client-side, so switching 7D/30D is
// instant and costs no request. It also buys the honest delta below: a
// 30-day window needs the 30 days BEFORE it to say "up 8%", and a route
// called with range=30d cannot supply them.
//
// WHY REVENUE SOMETIMES HAS NO DELTA. /api/admin/overview returns exactly 30
// daily points. At a 7-day window there is a previous 7 days to compare
// against inside that array; at 30 days there is not. The card omits the
// delta rather than inventing a comparison, which is why `delta` is nullable
// and why deltaOver returns null instead of zero.
//
// TWO SHAPES, ONE TREE. Below lg the three MetricCards are hidden and four
// Today tiles take their place; above lg it is the other way round. Both sit
// in the DOM and the breakpoint picks one, the precedent DataTable set and
// for the same reason: a JS media query would render the wrong shape on the
// server and then swap it, and a persisted period default would change what
// the desktop shows to satisfy the phone. "Today" here is the UTC calendar
// bucket every route on this panel already uses.
//
// THE FOURTH CARD IS NOT HARDCODED ANY MORE. It used to read pendingOrders
// and say one of two things. It now renders the top of the attention
// summary from lib/admin/attention.ts: a fault if there is one, a queue if
// not, "cannot tell" when a queue's source did not answer, and "nothing is
// waiting" only when every queue answered zero. One derivation feeds this
// card, the strip above it and the rail badges, so they cannot disagree.

import { useMemo } from "react";
import { useLiveData } from "@/lib/admin/useLiveData";
import { HERO_LABELS, HERO_PERIODS, HERO_WINDOW } from "@/lib/admin/heroPeriods";
import { LEVEL_WORD, type AttentionSummary } from "@/lib/admin/attention";
import { formatPrice } from "@/lib/shop/format";
import { MetricCard, FeatureCard, PeriodChips, type PeriodId } from "./hero";
import { Disclosure, KpiCard } from "./primitives";

type TrafficPoint = { date: string; visitors: number; views: number; signups: number };
type Traffic = { points: TrafficPoint[] };
type Stats = {
  /** null means the read failed, never that nobody is here. */
  liveCount: number | null;
  today: { visitors: number | null; views: number | null; signups: number | null };
};

const DASH = "—";

// The chips and their windows live in lib/admin/heroPeriods.ts, where a test
// holds them in step. `w` falls back to 30 on a miss, which is silent and wrong
// in the worst way: the chip would read Today while the card showed a month.
// A comment could not fail; that test can.

/**
 * Mean of the last `w` points against the mean of the `w` before them.
 *
 * Means, not sums, so a short preceding window still compares fairly. Null
 * when there is nothing to compare against, which the card renders as no
 * delta at all rather than as 0%.
 */
function deltaOver(series: number[], w: number): { value: number; positive: boolean } | null {
  if (series.length < w + 1) return null;
  const cur = series.slice(-w);
  const prev = series.slice(Math.max(0, series.length - w * 2), series.length - w);
  if (!prev.length) return null;
  const avg = (a: number[]) => a.reduce((s, n) => s + n, 0) / a.length;
  const p = avg(prev);
  // A previous window of zero has no percentage. Reporting "+100%" off a
  // zero base is the kind of number that looks like growth and means
  // "we had none before".
  if (p === 0) return null;
  const v = ((avg(cur) - p) / p) * 100;
  return { value: v, positive: v >= 0 };
}

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

const ICON = {
  visitors: (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="10" cy="10" r="7.2" />
      <path d="M2.8 10h14.4M10 2.8c1.9 2 2.9 4.5 2.9 7.2s-1 5.2-2.9 7.2c-1.9-2-2.9-4.5-2.9-7.2s1-5.2 2.9-7.2Z" />
    </svg>
  ),
  users: (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="10" cy="6.8" r="3.1" />
      <path d="M4 16.4a6 6 0 0 1 12 0" />
    </svg>
  ),
  revenue: (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 3v14M13.2 6.2A3.2 3.2 0 0 0 10 4.6h-.4a2.6 2.6 0 0 0 0 5.2h.8a2.6 2.6 0 0 1 0 5.2H10a3.2 3.2 0 0 1-3.2-1.6" />
    </svg>
  ),
};

export function HeroRow({
  period,
  onPeriod,
  onOpenTab,
  summary,
  onRetry,
  revenueSeries,
  revenueTodayCents,
  revenueMeasured,
  revenueLoading,
}: {
  period: PeriodId;
  onPeriod: (p: PeriodId) => void;
  onOpenTab: (id: string) => void;
  summary: AttentionSummary;
  onRetry: (url: string) => void;
  /** Daily net cents, oldest first, from the shell's overview poll. */
  revenueSeries: number[];
  /** null while unmeasured: not yet read, or the orders table did not answer. */
  revenueTodayCents: number | null;
  /**
   * The overview route answered and its orders read was sound. False while
   * loading, after a failed poll, and when the route reports ordersDegraded.
   * Every money figure below is a dash unless this is true.
   */
  revenueMeasured: boolean;
  revenueLoading: boolean;
}) {
  // 90 days so a 30-day window has a real 30 days behind it to compare with.
  const traffic = useLiveData<Traffic>("/api/admin/traffic?range=90d", 60_000);
  // The phone's Today tiles. ActivityFeed already polls this URL at 20s, so
  // this subscription shares its timer and its bytes.
  const stats = useLiveData<Stats>("/api/admin/stats", 20_000);

  const w = HERO_WINDOW[period] ?? 30;

  // The dates were already being fetched and then dropped on the floor: the
  // route returns daily buckets carrying a date, and the three maps below took
  // the numbers and discarded it. A sparkline you can scrub needs to be able to
  // say WHICH day the number under the cursor belongs to.
  const dates = useMemo(
    () => (traffic.data?.points ?? []).map((p) => p.date),
    [traffic.data],
  );
  const visitors = useMemo(
    () => (traffic.data?.points ?? []).map((p) => p.visitors),
    [traffic.data],
  );
  const signups = useMemo(
    () => (traffic.data?.points ?? []).map((p) => p.signups),
    [traffic.data],
  );
  const revenue = revenueSeries;

  // "1 days" is the tell that a window was templated rather than written, and
  // the one day window is not really a duration anyway: it is today's bucket.
  const over = w === 1 ? "today" : `${w} days`;

  const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);
  const win = (a: number[]) => a.slice(-w);

  // Traffic that never arrived is a dash, not a zero. `compact(sum([]))` read
  // "0" whenever the route had failed, under a line that says every number
  // here is measured.
  const measured = traffic.data !== null;

  // "12 Aug" reads faster than "2026-08-12" in a badge 58 units wide, and the
  // year is never in question on a 7 or 30 day window. Parsed as UTC because
  // the buckets are UTC dates, and constructing a local Date from "YYYY-MM-DD"
  // would shift the label a day backwards for anyone west of Greenwich.
  const dayLabels = useMemo(
    () =>
      dates.slice(-w).map((d) => {
        const t = Date.parse(d + "T00:00:00Z");
        return Number.isNaN(t)
          ? d
          : new Date(t).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              timeZone: "UTC",
            });
      }),
    [dates, w],
  );

  // Yesterday is the last COMPLETE bucket: points are oldest first and the
  // last one is today.
  const yesterdayVisitors = visitors.length > 1 ? visitors[visitors.length - 2] : null;
  const yesterdaySignups = signups.length > 1 ? signups[signups.length - 2] : null;

  return (
    <>
      {/* The measured line and the period control belong to the MetricCards,
          which exist above lg only. Below it the tiles say "Today" themselves. */}
      <div className="mb-4 hidden flex-wrap items-center justify-between gap-3 lg:flex">
        <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Every number in this row is measured, never modelled.
        </p>
        {/* "Today" rather than "24H": these buckets are calendar days in UTC,
            so the one day window is today's bucket and not a rolling day.
            The sparkline is a single point at this width and hero.tsx:61
            already renders an empty box below two points, so the card shows
            the figure and its delta against yesterday with no misleading
            flat line drawn under it. */}
        <PeriodChips
          active={period}
          onChange={onPeriod}
          options={HERO_PERIODS}
          labels={HERO_LABELS}
        />
      </div>

      {/* items-start: a grid row stretches every card to the tallest, and the
          attention card on the right runs to 600px when it has findings and
          buttons to show. Stretched, the three stat cards carried their
          sparkline in the middle of 400px of nothing (seen on production
          2026-09-04). Each card now sizes to its own content. */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(240px,0.85fr)] lg:items-start">
        <TodayTiles
          className="col-span-full lg:hidden"
          stats={stats}
          revenueTodayCents={revenueTodayCents}
          revenueMeasured={revenueMeasured}
          revenueLoading={revenueLoading}
          yesterdayVisitors={yesterdayVisitors}
          yesterdaySignups={yesterdaySignups}
        />

        <MetricCard
          id="hero-visitors"
          className="hidden lg:flex"
          icon={ICON.visitors}
          eyebrow="Site analytics"
          title="Visitors"
          label={`Unique visitors, ${over}`}
          value={measured ? compact(sum(win(visitors))) : DASH}
          delta={measured ? deltaOver(visitors, w) : null}
          points={measured ? win(visitors) : undefined}
          labels={dayLabels}
          format={compact}
          color="var(--adm-s1)"
          loading={traffic.loading}
          emptyLabel={measured ? undefined : "Not measured"}
          onOpen={() => onOpenTab("traffic")}
          openLabel="Open Traffic"
        />
        <MetricCard
          id="hero-signups"
          className="hidden lg:flex"
          icon={ICON.users}
          eyebrow="Accounts created"
          title="New users"
          label={`Sign-ups, ${over}`}
          value={measured ? compact(sum(win(signups))) : DASH}
          delta={measured ? deltaOver(signups, w) : null}
          points={measured ? win(signups) : undefined}
          labels={dayLabels}
          format={compact}
          color="var(--adm-s2)"
          loading={traffic.loading}
          emptyLabel={measured ? undefined : "Not measured"}
          onOpen={() => onOpenTab("users")}
          openLabel="Open Users"
        />
        <MetricCard
          id="hero-revenue"
          className="hidden lg:flex"
          icon={ICON.revenue}
          // Shop only, and it always was. /api/admin/overview builds this
          // series from shop_orders and nothing else; donations live in monthly
          // rows and subscription revenue has no date at all, so neither can be
          // in a daily figure. The old eyebrow read "Shop, donations, subs".
          eyebrow="Shop orders only"
          title="Revenue"
          label={`Net, ${over}`}
          // A dash when the orders table did not answer. The route sends an
          // empty series then, and money(sum([])) printed "$0" under a line
          // that says every number here is measured.
          value={revenueMeasured ? money(sum(win(revenue))) : DASH}
          delta={revenueMeasured ? deltaOver(revenue, w) : null}
          points={revenueMeasured ? win(revenue) : undefined}
          format={money}
          color="var(--adm-s5)"
          loading={revenueLoading}
          emptyLabel={revenueMeasured ? undefined : "Not measured"}
          onOpen={() => onOpenTab("revenue")}
          openLabel="Open Revenue"
        />

        <WaitingCard summary={summary} onOpenTab={onOpenTab} onRetry={onRetry} />
      </div>

      {/* The desktop's 30-day figures, folded on a phone. They are context,
          not the answer, and a first screen that fits in one thumb-length
          is the whole point of the tiles above. */}
      <div className="mb-6 lg:hidden">
        <Disclosure title="Last 30 days" hint="Revenue, visitors, new users">
          <div className="grid grid-cols-2 gap-4">
            <KpiCard
              label="Revenue, 30 days"
              subtitle="net of refunds"
              value={revenueMeasured ? money(sum(revenue.slice(-30))) : revenueLoading ? "…" : DASH}
            />
            <KpiCard
              label="Visitors, 30 days"
              value={measured ? compact(sum(visitors.slice(-30))) : traffic.loading ? "…" : DASH}
            />
            <KpiCard
              label="New users, 30 days"
              value={measured ? compact(sum(signups.slice(-30))) : traffic.loading ? "…" : DASH}
            />
          </div>
        </Disclosure>
      </div>
    </>
  );
}

/**
 * The phone's first screen: what happened today, in four numbers.
 *
 * No sparklines, no deltas, no period. A phone held standing up gets the
 * number and, where one exists, yesterday's beside it, which is the only
 * comparison that reads at a glance.
 */
function TodayTiles({
  className,
  stats,
  revenueTodayCents,
  revenueMeasured,
  revenueLoading,
  yesterdayVisitors,
  yesterdaySignups,
}: {
  className?: string;
  stats: { data: Stats | null; loading: boolean };
  revenueTodayCents: number | null;
  revenueMeasured: boolean;
  revenueLoading: boolean;
  yesterdayVisitors: number | null;
  yesterdaySignups: number | null;
}) {
  const t = stats.data?.today;
  const val = (v: number | null | undefined): string | number =>
    stats.data ? (v === null || v === undefined ? DASH : v) : stats.loading ? "…" : DASH;

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="font-sans text-[13px] font-medium" style={{ color: "var(--adm-ink-3)" }}>
          Today
        </h3>
        <span className="font-sans text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
          UTC day
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          label="Visitors"
          value={val(t?.visitors)}
          hint={yesterdayVisitors === null ? undefined : `yesterday ${yesterdayVisitors}`}
        />
        <KpiCard
          label="New users"
          value={val(t?.signups)}
          hint={yesterdaySignups === null ? undefined : `yesterday ${yesterdaySignups}`}
        />
        <KpiCard
          label="Revenue"
          subtitle="UTC day"
          // formatPrice, so the figure carries a currency mark and Odometer's
          // money detection puts it under the streamer mask.
          value={
            !revenueMeasured || revenueTodayCents === null
              ? revenueLoading
                ? "…"
                : DASH
              : formatPrice(revenueTodayCents, "usd")
          }
        />
        <KpiCard
          label="Reading now"
          value={stats.data ? (stats.data.liveCount ?? DASH) : stats.loading ? "…" : DASH}
          hint="seen in the last 90 seconds"
        />
      </div>
    </div>
  );
}

const QUEUE_SOURCES = new Set(["overview", "support", "verification", "community"]);

/**
 * Whatever should happen next, from the attention summary.
 *
 * Faults outrank queues; a queue whose source did not answer outranks a
 * queue that did, because "nothing is waiting" is a claim this card must
 * not make on a partial read. The other queues ride along as rows so the
 * count of everything waiting is on the card without opening anything.
 */
function WaitingCard({
  summary,
  onOpenTab,
  onRetry,
}: {
  summary: AttentionSummary;
  onOpenTab: (id: string) => void;
  onRetry: (url: string) => void;
}) {
  const rows = summary.queues.map((q) => ({ label: q.label, onClick: () => onOpenTab(q.go.tab) }));
  const fault = summary.faults[0];
  const queueGaps = summary.unmeasured.filter((u) => QUEUE_SOURCES.has(u.source));
  // A queue that has not answered yet is not a gap, and not a zero either.
  // Without this, one failed non-queue source put the summary in "unknown",
  // skipped the checking branch, and the card said "No unpaid orders, no open
  // tickets" before support or verification had answered at all.
  const queueLoading = summary.loading.some((s) => QUEUE_SOURCES.has(s));

  if (fault) {
    return (
      <FeatureCard
        badge={fault.word}
        title={fault.title}
        body={fault.body}
        rows={rows}
        primary={
          fault.retryUrl && fault.level === "critical" && fault.source === "overview"
            ? { label: "Retry", onClick: () => onRetry(fault.retryUrl as string) }
            : { label: fault.go.label, onClick: () => onOpenTab(fault.go.tab) }
        }
        secondary={fault.also ? { label: fault.also.label, onClick: () => onOpenTab(fault.also!.tab) } : undefined}
      />
    );
  }

  if (queueGaps.length > 0) {
    const k = queueGaps.length;
    return (
      <FeatureCard
        badge={LEVEL_WORD.unmeasured}
        title="Cannot tell what is waiting"
        body={
          k === 1
            ? "1 of the queues did not answer, so this card cannot say nothing is waiting."
            : `${k} of the queues did not answer, so this card cannot say nothing is waiting.`
        }
        rows={rows}
        primary={{
          label: "Retry",
          onClick: () => queueGaps.forEach((u) => u.retryUrl && onRetry(u.retryUrl)),
        }}
      />
    );
  }

  if (queueLoading && summary.queues.length === 0) {
    return (
      <FeatureCard
        badge="Checking"
        title="Checking what is waiting"
        body="The queues have not answered yet. This card fills in the moment they do."
      />
    );
  }

  const top = summary.queues[0];
  if (top) {
    return (
      <FeatureCard
        badge={`${top.count ?? 0} waiting`}
        title={top.title}
        body={top.body}
        rows={rows.slice(1)}
        primary={{ label: top.go.label, onClick: () => onOpenTab(top.go.tab) }}
        secondary={top.also ? { label: top.also.label, onClick: () => onOpenTab(top.also!.tab) } : undefined}
      />
    );
  }

  return (
    <FeatureCard
      badge="Clear"
      title="Nothing is waiting"
      body="No unpaid orders, no open tickets, no requests, no reports. This card fills in when something needs a decision from you."
    />
  );
}
