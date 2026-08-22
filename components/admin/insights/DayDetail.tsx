"use client";

import { useEffect, useRef } from "react";
import { Modal, Pill } from "../primitives";
import { RatioMeter, StandingPill } from "./GradeBadge";
import {
  cellMetrics,
  dailyTargetFor,
  rangeOf,
  shortDayLabel,
} from "@/lib/admin/insights/calendar";
import { rangeValue } from "@/lib/admin/insights/ingest";
import type { Forecast, Goal, Series } from "@/lib/admin/insights/types";

/**
 * One day, and what it contributed to the week and the month around it.
 *
 * FOCUS. Modal now traps, enters and restores on its own, so the restore this
 * file used to do by hand is gone and returnFocusTo is simply forwarded to it.
 * What stays here is the heading focus: Modal enters on the panel, which
 * announces the dialog by name, and this narrows that to the date and the
 * series being shown. Child effects run before parent ones, so this lands
 * after Modal's entry rather than being overwritten by it.
 */
export function DayDetail({
  dayKey,
  series,
  forecast,
  goals,
  money,
  onClose,
  returnFocusTo,
}: {
  dayKey: string;
  series: Series | null;
  forecast: Forecast | null;
  goals: Goal[];
  money: boolean;
  onClose: () => void;
  /** The cell that opened this, so focus can go home. */
  returnFocusTo?: HTMLElement | null;
}) {
  const headingRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const goal = series ? goals.find((g) => g.seriesId === series.id && !g.paused) ?? null : null;
  const target = dailyTargetFor(goal, series, dayKey);
  const m = cellMetrics(series, forecast, dayKey, target);

  const fmt = (n: number) =>
    money
      ? `$${(n / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
      : n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  // What this day is worth against the week and the month it sits in. Only
  // meaningful for a flow: a share of a level is not a thing.
  const week = series ? rangeOf({ kind: "weekly", anchor: dayKey }) : null;
  const month = series ? rangeOf({ kind: "monthly", anchor: dayKey }) : null;
  const weekTotal = series && week ? rangeValue(series, week.from, week.to) : null;
  const monthTotal = series && month ? rangeValue(series, month.from, month.to) : null;
  const isFlow = series?.kind === "flow";
  const value = m.actual;

  const shareOf = (total: number | null | undefined) =>
    isFlow && value !== null && total && total > 0 ? value / total : null;

  return (
    <Modal
      title={shortDayLabel(dayKey)}
      subtitle={series ? series.label : "No series selected"}
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      header={
        m.isFuture ? (
          <Pill tone="neutral">Predicted</Pill>
        ) : m.hasData ? (
          <Pill tone="emerald">Measured</Pill>
        ) : (
          <Pill tone="neutral">No data</Pill>
        )
      }
    >
      <p ref={headingRef} tabIndex={-1} className="sr-only">
        Detail for {dayKey}
      </p>

      <div className="space-y-5">
        <div>
          <p className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {m.isFuture ? "Projected" : "Measured"}
          </p>
          <p
            className="mt-0.5 font-sans text-[30px] font-semibold leading-none tabular-nums"
            style={{
              color: "var(--adm-ink)",
              fontStyle: m.isFuture ? "italic" : "normal",
            }}
          >
            {m.actual !== null
              ? fmt(m.actual)
              : m.predicted !== null
                ? fmt(m.predicted)
                : "no data"}
          </p>
          {!m.hasData && !m.isFuture ? (
            <p className="mt-1.5 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
              The report does not cover this day. That is different from a day
              with nothing on it, which would read zero.
            </p>
          ) : null}
        </div>

        {target !== null ? (
          <div>
            <RatioMeter
              label={`Against a target of ${fmt(target)}`}
              ratio={m.actual !== null && target > 0 ? m.actual / target : null}
              standing={m.standing}
            />
            <div className="mt-2">
              <StandingPill standing={m.standing} />
            </div>
          </div>
        ) : (
          <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
            No active goal targets this series, so there is nothing to grade this
            day against.
          </p>
        )}

        {/* The contribution. Flow only, and it says why when it is absent. */}
        {isFlow ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Contribution
              label="Share of its week"
              share={shareOf(weekTotal?.value)}
              total={weekTotal ? fmt(weekTotal.value) : null}
              covered={weekTotal ? `${weekTotal.covered} of ${weekTotal.days} days measured` : ""}
            />
            <Contribution
              label="Share of its month"
              share={shareOf(monthTotal?.value)}
              total={monthTotal ? fmt(monthTotal.value) : null}
              covered={monthTotal ? `${monthTotal.covered} of ${monthTotal.days} days measured` : ""}
            />
          </div>
        ) : series ? (
          <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
            {series.label} is a running level, not a daily count, so a single day
            has no share of its week or month. The figure above is where the
            level stood.
          </p>
        ) : null}

        {money ? (
          <p
            className="rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[11.5px]"
            style={{
              borderColor: "var(--adm-line)",
              background: "var(--adm-panel-2)",
              color: "var(--adm-ink-3)",
            }}
          >
            Shop orders only. Donations are stored monthly and subscription
            revenue has no date, so neither can be placed on a day. Orders are
            counted on the day checkout STARTED, not the day payment settled:
            there is no settlement timestamp in the database, so an order begun
            late on one night and paid the next morning lands on the night.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function Contribution({
  label,
  share,
  total,
  covered,
}: {
  label: string;
  share: number | null;
  total: string | null;
  covered: string;
}) {
  return (
    <div
      className="rounded-[var(--adm-radius-sm)] border p-3"
      style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel-2)" }}
    >
      <p className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
        {label}
      </p>
      <p
        className="mt-0.5 font-sans text-[19px] font-semibold tabular-nums"
        style={{ color: "var(--adm-ink)" }}
      >
        {share === null ? "n/a" : `${Math.round(share * 100)}%`}
      </p>
      <p className="font-sans text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
        {total === null ? "" : `of ${total}`}
        {covered ? ` · ${covered}` : ""}
      </p>
    </div>
  );
}
