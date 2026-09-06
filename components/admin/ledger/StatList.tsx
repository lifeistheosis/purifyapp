"use client";

import { SENSITIVE } from "@/lib/admin/streamer";
import { deltaColor, deltaText, deltaTone, type DeltaSpec } from "@/lib/admin/ledger/delta";
import { CountUp } from "./CountUp";
import { Sparkline } from "./Sparkline";

/**
 * The phone's Summary: one row per metric, label on the left, value and
 * delta on the right, a 24px sparkline between them. Hairlines between
 * rows, 44px tall each so a row is a target when it has an onClick.
 *
 * It is also the right shape for any "by source" breakdown on desktop,
 * which is where the old donut chart went.
 */
export type StatRow = {
  id: string;
  label: string;
  value?: string | number | null;
  delta?: DeltaSpec;
  trend?: number[];
  sensitive?: boolean;
  onClick?: () => void;
};

export function StatList({
  rows,
  loading,
  error,
  empty = "Nothing to list yet.",
  emptyHref,
  onPin,
  pinned,
}: {
  rows: StatRow[];
  loading?: boolean;
  error?: string;
  empty?: string;
  emptyHref?: { href: string; label: string };
  /** Adds a pin control at the end of each row. */
  onPin?: (id: string) => void;
  /** Ids already pinned, drawn in the gold. */
  pinned?: readonly string[];
}) {
  if (loading) {
    return (
      <ul className="divide-y" style={{ borderColor: "var(--adm-line)" }}>
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex h-11 items-center justify-between gap-3" style={{ borderColor: "var(--adm-line)" }}>
            <span aria-hidden className="adm-skeleton block" style={{ width: "40%", height: 10 }} />
            <span aria-hidden className="adm-skeleton block" style={{ width: 56, height: 14 }} />
          </li>
        ))}
      </ul>
    );
  }
  if (error) {
    return (
      <p className="py-3 font-sans text-[12.5px]" style={{ color: "var(--adm-down)" }}>
        {error}
      </p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="py-3 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
        {empty}
        {emptyHref ? (
          <>
            {" "}
            <a href={emptyHref.href} className="underline underline-offset-2" style={{ color: "var(--adm-ink-2)" }}>
              {emptyHref.label}
            </a>
          </>
        ) : null}
      </p>
    );
  }
  return (
    <ul className="divide-y" style={{ borderColor: "var(--adm-line)" }}>
      {rows.map((r) => {
        const has = r.value !== null && r.value !== undefined && r.value !== "";
        const tone = r.delta ? deltaTone(r.delta) : "flat";
        const body = (
          <>
            <span className="min-w-0 flex-1 truncate font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
              {r.label}
            </span>
            {r.trend && r.trend.length > 1 ? (
              <span className="hidden shrink-0 sm:block">
                <Sparkline data={r.trend} width={64} height={24} />
              </span>
            ) : null}
            <span className="flex shrink-0 items-baseline gap-2">
              {r.delta && has ? (
                <span className="font-sans text-[12px]" style={{ color: deltaColor(tone) }}>
                  {deltaText(r.delta)}
                </span>
              ) : null}
              <span
                className={"font-sans text-[15px] font-medium" + (r.sensitive ? ` ${SENSITIVE}` : "")}
                style={{ color: has ? "var(--adm-ink)" : "var(--adm-ink-3)", fontVariantNumeric: "tabular-nums" }}
              >
                {has ? <CountUp value={r.value as string | number} /> : "—"}
              </span>
            </span>
          </>
        );
        const isPinned = pinned?.includes(r.id) ?? false;
        const pin = onPin ? (
          <button
            type="button"
            onClick={() => onPin(r.id)}
            aria-pressed={isPinned}
            aria-label={isPinned ? `Unpin ${r.label}` : `Pin ${r.label}`}
            title={isPinned ? "Unpin from Summary" : "Pin to Summary"}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--adm-radius-sm)]"
            style={{ color: isPinned ? "var(--adm-up)" : "var(--adm-ink-3)" }}
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12.5 2.5 17.5 7.5 13.8 9.3 12 15l-3.5-3.5L4 16l4.5-4.5L5 8l5.7-1.8z" />
            </svg>
          </button>
        ) : null;
        return (
          <li key={r.id} className={pin ? "flex items-center gap-1" : undefined} style={{ borderColor: "var(--adm-line)" }}>
            {r.onClick ? (
              <button
                type="button"
                onClick={r.onClick}
                className="adm-control flex h-11 min-w-0 flex-1 items-center gap-3 rounded-[var(--adm-radius-sm)] px-1 text-left"
                style={
                  {
                    "--_bg": "transparent",
                    "--_bg-hover": "var(--adm-hover)",
                  } as React.CSSProperties
                }
              >
                {body}
              </button>
            ) : (
              <div className="flex h-11 min-w-0 flex-1 items-center gap-3 px-1">{body}</div>
            )}
            {pin}
          </li>
        );
      })}
    </ul>
  );
}
