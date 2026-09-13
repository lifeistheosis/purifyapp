"use client";

import { Freshness } from "../Freshness";

/**
 * The period control that sits above a group of tiles.
 *
 * 7 / 30 / 90 / YTD, and a custom range when the caller supports one,
 * as hairline segments; a compare toggle; and on the right the "last
 * refreshed" line with its refresh glyph, which is the existing Freshness
 * component. Below md the segments collapse to a select so two controls
 * fit on one line at 390px.
 */
export type PeriodId = "7d" | "30d" | "90d" | "ytd" | "custom";

const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "ytd", label: "Year to date" },
];

export function PeriodBar({
  period,
  onPeriod,
  allowCustom,
  compare,
  onCompare,
  lastSynced,
  failing,
  onRefresh,
}: {
  period: PeriodId;
  onPeriod: (p: PeriodId) => void;
  /** Adds the Custom segment. The range picker itself is the caller's. */
  allowCustom?: boolean;
  compare?: boolean;
  onCompare?: (on: boolean) => void;
  lastSynced?: Date | null;
  failing?: boolean;
  onRefresh?: () => void;
}) {
  const options = allowCustom ? [...PERIODS, { id: "custom" as const, label: "Custom" }] : PERIODS;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {/* Segments from md up. */}
        <div
          role="group"
          aria-label="Period"
          className="hidden items-center rounded-[var(--adm-radius-sm)] border md:inline-flex"
          style={{ borderColor: "var(--adm-line-strong)" }}
        >
          {options.map((p, i) => {
            const on = p.id === period;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() => onPeriod(p.id)}
                className="h-8 px-3 font-sans text-[12.5px]"
                style={{
                  color: on ? "var(--adm-up)" : "var(--adm-ink-2)",
                  fontWeight: on ? 500 : 400,
                  borderLeft: i === 0 ? undefined : "1px solid var(--adm-line)",
                  background: "transparent",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        {/* A select below md. Native, so it is 44px on a phone by itself. */}
        <label className="md:hidden">
          <span className="sr-only">Period</span>
          <select
            value={period}
            onChange={(e) => onPeriod(e.target.value as PeriodId)}
            className="h-11 rounded-[var(--adm-radius-sm)] border bg-transparent px-2 font-sans text-[16px]"
            style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink)" }}
          >
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        {onCompare ? (
          <button
            type="button"
            aria-pressed={!!compare}
            onClick={() => onCompare(!compare)}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--adm-radius-sm)] border px-2.5 font-sans text-[12.5px] md:h-8"
            style={{
              borderColor: compare ? "var(--adm-up)" : "var(--adm-line-strong)",
              color: compare ? "var(--adm-up)" : "var(--adm-ink-2)",
            }}
          >
            <svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" aria-hidden>
              <path d="M0 6 L5 2 L9 5 L14 1" />
            </svg>
            Compare
          </button>
        ) : null}
      </div>

      {lastSynced !== undefined && onRefresh ? (
        <Freshness lastSynced={lastSynced} failing={!!failing} onRefresh={onRefresh} />
      ) : null}
    </div>
  );
}
