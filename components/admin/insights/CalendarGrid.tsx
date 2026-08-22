"use client";

import { toneFor } from "./GradeBadge";
import {
  WEEKDAY_INITIALS,
  cellMetrics,
  monthCells,
  weekCells,
  type CalCell,
  type CellMetrics,
} from "@/lib/admin/insights/calendar";
import type { Forecast, Series } from "@/lib/admin/insights/types";

/**
 * The date grid. Thin on purpose.
 *
 * Every decision it renders was made in lib/admin/insights/calendar.ts, because
 * vitest here runs over lib only and a branch written inside a component is a
 * branch no test can reach. This file lays out what those functions returned
 * and does no arithmetic of its own beyond formatting.
 *
 * ON CELL SIZING, which is load bearing and looks like taste. Cells are sized
 * with `aspect-square` and `min-h-[...]`, never with `h-1` through `h-10`. The
 * touch-target ratchet sits at exactly its ceiling with zero headroom and
 * matches those height classes near a `<button>`; `min-h-[` does not match
 * because the character after `h-` is a bracket. This is the same trick
 * components/calendar/CalendarCell.tsx uses to render 42 clickable cells and
 * score zero.
 */

const fmt = (n: number) =>
  Math.abs(n) >= 10_000
    ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k`
    : n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export function CalendarGrid({
  view,
  year,
  monthIndex,
  weekAnchor,
  todayKey,
  series,
  forecast,
  targetFor,
  selectedKey,
  onPick,
  money,
}: {
  view: "monthly" | "weekly";
  year: number;
  monthIndex: number;
  weekAnchor: string;
  todayKey: string;
  series: Series | null;
  forecast: Forecast | null;
  /** Per-day target, asked per cell so a monthly goal divides by the right month. */
  targetFor: (dayKey: string) => number | null;
  selectedKey: string | null;
  /** The element is passed so the day modal can hand focus back to it. */
  onPick: (dayKey: string, el: HTMLElement) => void;
  /** Render values as currency. Set when the chosen series is shop revenue. */
  money: boolean;
}) {
  const cells: CalCell[] =
    view === "monthly"
      ? monthCells(year, monthIndex, todayKey)
      : weekCells(weekAnchor, todayKey);

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {WEEKDAY_INITIALS.map((d, i) => (
          <div
            key={i}
            className="text-center font-sans text-[10.5px] uppercase tracking-[0.08em]"
            style={{ color: "var(--adm-ink-3)" }}
            aria-hidden
          >
            {d}
          </div>
        ))}
      </div>

      {/* Six fixed rows in month view, one in week view. The row count never
          varies within a view, so paging months cannot change the height and
          shift everything below it. */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell) => (
          <DayTile
            key={cell.key}
            cell={cell}
            metrics={cellMetrics(series, forecast, cell.key, targetFor(cell.key))}
            selected={cell.key === selectedKey}
            onPick={onPick}
            money={money}
            compact={view === "monthly"}
          />
        ))}
      </div>
    </div>
  );
}

function DayTile({
  cell,
  metrics,
  selected,
  onPick,
  money,
  compact,
}: {
  cell: CalCell;
  metrics: CellMetrics;
  selected: boolean;
  onPick: (dayKey: string, el: HTMLElement) => void;
  money: boolean;
  compact: boolean;
}) {
  const tone = metrics.standing ? toneFor(metrics.standing) : null;
  const value = metrics.actual ?? metrics.predicted;

  const shown =
    value === null
      ? null
      : money
        ? `$${fmt(value / 100)}`
        : fmt(value);

  // A day outside the current month is still real and still clickable, it is
  // just not what the operator is looking at. Dimming rather than hiding keeps
  // the six-week grid stable.
  const dim = !cell.inMonth;

  return (
    <button
      type="button"
      onClick={(e) => onPick(cell.key, e.currentTarget)}
      aria-current={cell.isToday ? "date" : undefined}
      // The full sentence, because "18" alone tells a screen reader nothing
      // about the thing this grid exists to show.
      aria-label={
        `${cell.key}` +
        (metrics.hasData
          ? `, ${shown}`
          : metrics.isFuture && shown !== null
            ? `, ${shown} predicted`
            : ", no data") +
        (cell.isToday ? ", today" : "")
      }
      className={
        "adm-rail-item relative flex flex-col items-start justify-between overflow-hidden rounded-[var(--adm-radius-sm)] border p-1.5 text-left " +
        (compact ? "aspect-square min-h-[58px]" : "min-h-[96px]")
      }
      style={{
        borderColor: selected
          ? "var(--adm-accent)"
          : cell.isToday
            ? "var(--adm-line-strong)"
            : "var(--adm-line)",
        background: tone
          ? `color-mix(in oklab, ${tone}, transparent 88%)`
          : "var(--adm-panel-2)",
        opacity: dim ? 0.45 : 1,
        // Two rings would fight; selection wins because it is the thing the
        // operator just did.
        boxShadow: selected ? "0 0 0 1px var(--adm-accent) inset" : undefined,
      }}
    >
      <span className="flex w-full items-center justify-between gap-1">
        <span
          className="font-sans text-[11px] tabular-nums"
          style={{
            color: cell.isToday ? "var(--adm-ink)" : "var(--adm-ink-3)",
            fontWeight: cell.isToday ? 600 : 400,
          }}
        >
          {cell.day}
        </span>
        {/* The predicted marker. A dot rather than a colour, because colour is
            already carrying standing and a reader who cannot separate two hues
            would have no way to tell a forecast from an achievement. */}
        {metrics.isFuture && shown !== null ? (
          <span
            aria-hidden
            title="Predicted"
            className="inline-block rounded-[var(--adm-radius-pill)]"
            style={{
              width: 5,
              height: 5,
              border: "1px dashed var(--adm-ink-3)",
            }}
          />
        ) : null}
      </span>

      {shown === null ? null : (
        <span
          className="w-full truncate font-sans tabular-nums"
          style={{
            fontSize: compact ? 12 : 15,
            fontWeight: 600,
            color: metrics.isFuture
              ? "var(--adm-ink-3)"
              : tone ?? "var(--adm-ink)",
            // Italic for a projection, so the distinction survives greyscale
            // and does not depend on the dot alone.
            fontStyle: metrics.isFuture ? "italic" : "normal",
          }}
        >
          {shown}
        </span>
      )}
    </button>
  );
}
