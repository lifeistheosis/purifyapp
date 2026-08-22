"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, FilterSelect, SubTabs, Toolbar, ToolbarButton } from "../primitives";
import { CalendarGrid } from "../insights/CalendarGrid";
import { DayDetail } from "../insights/DayDetail";
import { GradeBadge, RatioMeter, StandingPill } from "../insights/GradeBadge";
import { useInsights } from "@/lib/admin/insights/store";
import { adminJson } from "@/lib/admin/fetchJson";
import { forecastSeries } from "@/lib/admin/insights/forecast";
import { rangeValue } from "@/lib/admin/insights/ingest";
import {
  dailyTargetFor,
  dateOf,
  monthLabel,
  rangeOf,
  shiftKey,
  shortDayLabel,
  startOfMonth,
  startOfWeek,
} from "@/lib/admin/insights/calendar";
import { keyOf } from "@/lib/rhythm/dayKey";
import { useToday } from "@/lib/calendar/useToday";
import type { Series } from "@/lib/admin/insights/types";

/**
 * The calendar tab.
 *
 * WHAT MAKES IT A COMMAND CENTER RATHER THAN A WALL CHART: picking a day, week
 * or month writes a selection into the insights store, and the grades on the
 * Growth and Goals tabs re-measure against that exact window in the same
 * render. Nothing here recomputes a grade locally, so the calendar and the
 * grade pages cannot disagree.
 *
 * TODAY IS RESOLVED ON THE CLIENT, after mount. noFrozenDay.test.ts scans
 * components/admin and fails any file that resolves "now" in a server
 * component, because a day computed at build time froze for the life of an
 * install twice before. useToday() resolves the operator's own calendar day
 * after mount and re-syncs at their local midnight.
 */

const REVENUE_SERIES_ID = "shop-revenue-daily";

type DailyRevenue = {
  days: { date: string; netCents: number; orderCount: number }[];
  from: string;
  to: string;
  truncated?: boolean;
};

export function CalendarTab() {
  const { dataset, goals, forecasts, grades, selection, setSelection } = useInsights();

  /**
   * Today, resolved on the device.
   *
   * useToday is the house hook for this and is used rather than a local effect
   * for two reasons beyond the lint rule against setting state in one: it
   * re-syncs at local midnight, so a panel left open overnight moves its today
   * marker, and it keeps the same Date identity while the day has not turned,
   * so the memos below do not churn. Null until mounted, which is what
   * noFrozenDay.test.ts is enforcing: a day resolved on the server freezes.
   */
  const todayDate = useToday();
  const today = todayDate ? keyOf(todayDate) : null;

  const [view, setView] = useState<"monthly" | "weekly">("monthly");
  // Null means "follow today". Derived below rather than copied into state by
  // an effect, which would be a second source of truth for the same fact.
  const [cursorOverride, setCursorOverride] = useState<string | null>(null);
  const cursor = cursorOverride ?? today;
  const [openDay, setOpenDay] = useState<{ key: string; el: HTMLElement | null } | null>(null);
  const [metricChoice, setMetricChoice] = useState<string>(REVENUE_SERIES_ID);
  const [revenue, setRevenue] = useState<DailyRevenue | null>(null);
  const [revenueFailed, setRevenueFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    adminJson<DailyRevenue>("/api/admin/revenue/daily").then((r) => {
      if (!alive) return;
      if (r) setRevenue(r);
      else setRevenueFailed(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Shop revenue as a Series, so the calendar treats it exactly like an
   * imported column and every function downstream stays metric-agnostic.
   *
   * A FLOW: money taken on Monday plus money taken on Tuesday is a real total,
   * which is what makes a share-of-week figure meaningful.
   */
  const revenueSeries = useMemo<Series | null>(() => {
    if (!revenue) return null;
    return {
      id: REVENUE_SERIES_ID,
      label: "Shop revenue",
      kind: "flow",
      source: "shop_orders.created_at",
      points: revenue.days.map((d) => ({ day: d.date, value: d.netCents })),
    };
  }, [revenue]);

  const options = useMemo(() => {
    const out: [string, string][] = [];
    if (revenueSeries) out.push([REVENUE_SERIES_ID, "Shop revenue"]);
    for (const s of dataset?.series ?? []) out.push([s.id, s.label]);
    return out;
  }, [revenueSeries, dataset]);

  /**
   * The metric actually in force.
   *
   * Derived, not corrected. An effect that noticed the choice had gone stale
   * and wrote a new one would render once with a selector pointing at nothing,
   * and would be a cascading render besides. Falling back during render means
   * the invalid state never exists.
   */
  const metricId = options.some(([id]) => id === metricChoice)
    ? metricChoice
    : options[0]?.[0] ?? REVENUE_SERIES_ID;

  const series =
    metricId === REVENUE_SERIES_ID
      ? revenueSeries
      : dataset?.series.find((s) => s.id === metricId) ?? null;

  // The revenue series is not in the store, so it has no forecast there.
  // Computed here with the same function, so both paths behave identically.
  const forecast = useMemo(() => {
    if (!series) return null;
    if (metricId === REVENUE_SERIES_ID) return forecastSeries(series, 31);
    return forecasts[series.id] ?? null;
  }, [series, metricId, forecasts]);

  const money = metricId === REVENUE_SERIES_ID;

  const goal = series ? goals.find((g) => g.seriesId === series.id && !g.paused) ?? null : null;
  const targetFor = (dayKey: string) => dailyTargetFor(goal, series, dayKey);

  if (!today || !cursor) {
    return (
      <Card title="Calendar" subtitle="Resolving today on your device.">
        <div style={{ height: 420 }} />
      </Card>
    );
  }

  const cur = dateOf(cursor);
  const year = cur.getUTCFullYear();
  const monthIndex = cur.getUTCMonth();

  const step = (dir: -1 | 1) =>
    setCursorOverride(
      view === "monthly"
        ? startOfMonth(shiftKey(startOfMonth(cursor), dir === 1 ? 32 : -1))
        : shiftKey(cursor, dir * 7),
    );

  const selKind = view === "monthly" ? "monthly" : "weekly";
  const selAnchor = view === "monthly" ? startOfMonth(cursor) : startOfWeek(cursor);
  const range = rangeOf({ kind: selKind, anchor: selAnchor });
  const total = series ? rangeValue(series, range.from, range.to) : null;
  const scoped = grades[selKind];
  const isScoped =
    selection !== null && selection.kind === selKind && selection.anchor === selAnchor;

  const fmtVal = (n: number) =>
    money
      ? `$${(n / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <div className="space-y-5">
      <Card
        title={view === "monthly" ? monthLabel(year, monthIndex) : `Week of ${shortDayLabel(range.from)}`}
        subtitle={
          series
            ? `${series.label}. ${series.kind === "stock" ? "A running level, read at its latest point." : "A daily count, summed across the range."}`
            : "Import a report or wait for shop revenue to load."
        }
        action={
          <Toolbar>
            <ToolbarButton onClick={() => step(-1)} title="Previous">
              Prev
            </ToolbarButton>
            <ToolbarButton onClick={() => setCursorOverride(null)} title="Back to today">
              Today
            </ToolbarButton>
            <ToolbarButton onClick={() => step(1)} title="Next">
              Next
            </ToolbarButton>
          </Toolbar>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SubTabs
            tabs={[["monthly", "Month"], ["weekly", "Week"]] as const}
            active={view}
            onChange={(v) => setView(v)}
          />
          {options.length > 0 ? (
            <FilterSelect label="Metric" value={metricId} onChange={setMetricChoice} options={options} />
          ) : null}
        </div>

        <div
          // A fixed floor so paging between a 5-row and 6-row month, or between
          // month and week, cannot move everything underneath.
          style={{ minHeight: view === "monthly" ? 420 : 140 }}
        >
          <CalendarGrid
            view={view}
            year={year}
            monthIndex={monthIndex}
            weekAnchor={cursor}
            todayKey={today}
            series={series}
            forecast={forecast}
            targetFor={targetFor}
            selectedKey={openDay?.key ?? null}
            // The clicked element travels with the day. It used to be stashed
            // in a ref and read during render to hand to the modal, which is
            // exactly what refs are not for: a ref read in render can hold a
            // value from a paint the user never saw.
            onPick={(key, el) => setOpenDay({ key, el })}
            money={money}
          />
        </div>

        {revenueFailed ? (
          <p className="mt-3 font-sans text-[11.5px]" style={{ color: "var(--adm-warn)" }}>
            Shop revenue could not be read, so it is not offered as a metric.
            Imported report series are unaffected.
          </p>
        ) : null}
        {revenue?.truncated ? (
          <p className="mt-3 font-sans text-[11.5px]" style={{ color: "var(--adm-warn)" }}>
            That range held more orders than one read returns, so the earliest
            days may be short. Narrow the range.
          </p>
        ) : null}
      </Card>

      <Card
        title={view === "monthly" ? "This month" : "This week"}
        subtitle={`${range.from} to ${range.to}`}
        action={
          <Toolbar>
            <ToolbarButton
              variant={isScoped ? "danger" : "primary"}
              onClick={() =>
                isScoped ? setSelection(null) : setSelection({ kind: selKind, anchor: selAnchor })
              }
              title={
                isScoped
                  ? "Put Growth and Goals back on their rolling windows"
                  : "Grade Growth and Goals against this range instead of the rolling window"
              }
            >
              {isScoped ? "Clear scope" : "Scope the panel to this"}
            </ToolbarButton>
          </Toolbar>
        }
      >
        <div className="flex flex-wrap items-center gap-5">
          <GradeBadge letter={scoped.letter} standing={scoped.standing} size="lg" />
          <div className="min-w-[180px]">
            <StandingPill standing={scoped.standing} />
            <p className="mt-1.5 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
              {isScoped
                ? "Graded against this exact range."
                : "Graded against the rolling window. Scope it to measure this range."}
            </p>
          </div>
          <div className="min-w-[200px] flex-1">
            <RatioMeter ratio={scoped.ratio} standing={scoped.standing} label="Against goal" />
          </div>
          <div>
            <p className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
              {series?.kind === "stock" ? "Level at the end" : "Total in range"}
            </p>
            <p
              className="font-sans text-[19px] font-semibold tabular-nums"
              style={{ color: "var(--adm-ink)" }}
            >
              {total ? fmtVal(total.value) : "no data"}
            </p>
            <p className="font-sans text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
              {total ? `${total.covered} of ${total.days} days measured` : ""}
            </p>
          </div>
        </div>
      </Card>

      {openDay ? (
        <DayDetail
          dayKey={openDay.key}
          series={series}
          forecast={forecast}
          goals={goals}
          money={money}
          onClose={() => setOpenDay(null)}
          returnFocusTo={openDay.el}
        />
      ) : null}
    </div>
  );
}
