"use client";

// The three numbers and the one action, above every tab.
//
// ONE POLLER, FOUR CARDS. Visitors and New users both come out of
// /api/admin/traffic, which returns daily buckets carrying visitors, views
// and signups together, so two cards share one request. Revenue comes from
// /api/admin/overview, which this component does NOT fetch: AdminShell
// already polls it for the rail's live rows and the orders badge, and hands
// the series down. A second useLiveData on the same URL would have been a
// second timer and a second request for bytes already in memory.
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

import { useMemo } from "react";
import { useLiveData } from "@/lib/admin/useLiveData";
import { MetricCard, FeatureCard, PeriodChips, type PeriodId } from "./hero";

type TrafficPoint = { date: string; visitors: number; views: number; signups: number };
type Traffic = { points: TrafficPoint[] };

const WINDOW: Record<string, number> = { "7d": 7, "30d": 30 };

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
  pendingOrders,
  revenueSeries,
  revenueLoading,
}: {
  period: PeriodId;
  onPeriod: (p: PeriodId) => void;
  onOpenTab: (id: string) => void;
  pendingOrders: number | null;
  /** Daily net cents, oldest first, from the shell's overview poll. */
  revenueSeries: number[];
  revenueLoading: boolean;
}) {
  // 90 days so a 30-day window has a real 30 days behind it to compare with.
  const traffic = useLiveData<Traffic>("/api/admin/traffic?range=90d", 60_000);

  const w = WINDOW[period] ?? 30;

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

  const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);
  const win = (a: number[]) => a.slice(-w);

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

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Every number in this row is measured, never modelled.
        </p>
        <PeriodChips active={period} onChange={onPeriod} options={["7d", "30d"]} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(240px,0.85fr)]">
        <MetricCard
          id="hero-visitors"
          icon={ICON.visitors}
          eyebrow="Site analytics"
          title="Visitors"
          label={`Unique visitors, ${w} days`}
          value={compact(sum(win(visitors)))}
          delta={deltaOver(visitors, w)}
          points={win(visitors)}
          labels={dayLabels}
          format={compact}
          color="var(--adm-s1)"
          loading={traffic.loading}
          onOpen={() => onOpenTab("traffic")}
          openLabel="Open Traffic"
        />
        <MetricCard
          id="hero-signups"
          icon={ICON.users}
          eyebrow="Accounts created"
          title="New users"
          label={`Sign-ups, ${w} days`}
          value={compact(sum(win(signups)))}
          delta={deltaOver(signups, w)}
          points={win(signups)}
          labels={dayLabels}
          format={compact}
          color="var(--adm-s2)"
          loading={traffic.loading}
          onOpen={() => onOpenTab("users")}
          openLabel="Open Users"
        />
        <MetricCard
          id="hero-revenue"
          icon={ICON.revenue}
          // Shop only, and it always was. /api/admin/overview builds this
          // series from shop_orders and nothing else; donations live in monthly
          // rows and subscription revenue has no date at all, so neither can be
          // in a daily figure. The old eyebrow read "Shop, donations, subs".
          eyebrow="Shop orders only"
          title="Revenue"
          label={`Net, ${Math.min(w, revenue.length || w)} days`}
          value={money(sum(win(revenue)))}
          delta={deltaOver(revenue, w)}
          points={win(revenue)}
          format={money}
          color="var(--adm-s5)"
          loading={revenueLoading}
          onOpen={() => onOpenTab("revenue")}
          openLabel="Open Revenue"
        />

        {/* One card, one job: whatever should happen next. Orders waiting on
            payment outrank everything else in this panel because they are
            the only state where a person is on the other end of the wait. */}
        {pendingOrders && pendingOrders > 0 ? (
          <FeatureCard
            badge={`${pendingOrders} waiting`}
            title="Orders awaiting payment"
            body={
              `${pendingOrders} order${pendingOrders === 1 ? " is" : "s are"} sitting unpaid. ` +
              "Each one is a person who started a checkout and did not finish it."
            }
            primary={{ label: "Open Orders", onClick: () => onOpenTab("orders") }}
            secondary={{ label: "See Revenue", onClick: () => onOpenTab("revenue") }}
          />
        ) : (
          <FeatureCard
            badge="Clear"
            title="Nothing is waiting"
            body="No unpaid orders and no queue behind them. This card fills in when something needs a decision from you."
            primary={{ label: "Open Overview", onClick: () => onOpenTab("overview") }}
          />
        )}
      </div>
    </>
  );
}
