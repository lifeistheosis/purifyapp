"use client";

import { useId, useState, type ReactNode } from "react";

import { SENSITIVE } from "@/lib/admin/streamer";
import { deltaColor, deltaText, deltaTone, type DeltaSpec } from "@/lib/admin/ledger/delta";
import { CountUp } from "./CountUp";
import { Sparkline } from "./Sparkline";
import { useWidth } from "./useWidth";

/**
 * One number, with its name, its change, and its shape.
 *
 * Label 12px muted; value 30px tabular in the ink; delta 12px coloured by
 * direction only; a 36px sparkline under it. The tile is a white card on a
 * hairline and nothing else. Pinned tiles show a small gold mark; the pin
 * control appears on hover (and on focus, so a keyboard reaches it).
 *
 * Four states, decided by the caller: loading (skeletons), error (one red
 * sentence), empty (one muted sentence and an optional link), populated.
 */
export type KpiTileProps = {
  label: string;
  /** One sentence under the (i): how the number is counted. */
  info?: string;
  /** Already formatted, or a number to be formatted en-US. */
  value?: string | number | null;
  delta?: DeltaSpec;
  trend?: number[];
  /** Money masks itself under streamer mode. */
  sensitive?: boolean;
  loading?: boolean;
  error?: string;
  /** Shown when there is no value. One muted sentence. */
  empty?: string;
  /** Where the setup lives, when one exists. */
  emptyHref?: { href: string; label: string };
  pinned?: boolean;
  onPin?: () => void;
  /** Small caption after the delta, e.g. "vs prior 30 days". */
  caption?: string;
  /** Room for an action in the corner, e.g. a chart toggle. */
  action?: ReactNode;
};

export function KpiTile({
  label,
  info,
  value,
  delta,
  trend,
  sensitive,
  loading,
  error,
  empty = "Nothing to count yet.",
  emptyHref,
  pinned,
  onPin,
  caption,
  action,
}: KpiTileProps) {
  const [boxRef, width] = useWidth<HTMLDivElement>();
  const [infoOpen, setInfoOpen] = useState(false);
  const infoId = useId();
  const hasValue = value !== null && value !== undefined && value !== "";
  const tone = delta ? deltaTone(delta) : "flat";

  return (
    <div
      className="group relative flex min-w-0 flex-col rounded-[var(--adm-radius)] border p-4"
      style={{ background: "var(--adm-card)", borderColor: "var(--adm-line)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate font-sans text-[12.5px] leading-4" style={{ color: "var(--adm-ink-2)" }}>
            {label}
          </p>
          {info ? (
            <span className="relative inline-flex">
              <button
                type="button"
                aria-label={`About ${label}`}
                aria-describedby={infoOpen ? infoId : undefined}
                onMouseEnter={() => setInfoOpen(true)}
                onMouseLeave={() => setInfoOpen(false)}
                onFocus={() => setInfoOpen(true)}
                onBlur={() => setInfoOpen(false)}
                className="grid h-4 w-4 place-items-center rounded-full border font-sans text-[10px] leading-none"
                style={{ borderColor: "var(--adm-line-strong)", color: "var(--adm-ink-3)" }}
              >
                i
              </button>
              {infoOpen ? (
                <span
                  role="tooltip"
                  id={infoId}
                  className="absolute left-0 top-[calc(100%+6px)] z-10 w-56 rounded-[var(--adm-radius-sm)] border px-2.5 py-2 font-sans text-[12px] leading-snug"
                  style={{
                    background: "var(--adm-panel-2)",
                    borderColor: "var(--adm-line)",
                    color: "var(--adm-ink)",
                  }}
                >
                  {info}
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          {onPin ? (
            <button
              type="button"
              onClick={onPin}
              aria-pressed={pinned}
              aria-label={pinned ? `Unpin ${label}` : `Pin ${label}`}
              title={pinned ? "Unpin from Summary" : "Pin to Summary"}
              className={
                "grid h-6 w-6 place-items-center rounded-[var(--adm-radius-sm)] transition-opacity " +
                (pinned ? "opacity-100" : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100")
              }
              style={{ color: pinned ? "var(--adm-up)" : "var(--adm-ink-3)" }}
            >
              <PinGlyph filled={!!pinned} />
            </button>
          ) : pinned ? (
            <span className="grid h-6 w-6 place-items-center" style={{ color: "var(--adm-up)" }} aria-label="Pinned">
              <PinGlyph filled />
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 min-h-[36px]">
        {loading ? (
          <span aria-hidden className="adm-skeleton block" style={{ width: "58%", height: 30 }} />
        ) : error ? (
          <p className="font-sans text-[12.5px] leading-snug" style={{ color: "var(--adm-down)" }}>
            {error}
          </p>
        ) : !hasValue ? (
          <p className="font-sans text-[12.5px] leading-snug" style={{ color: "var(--adm-ink-3)" }}>
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
        ) : (
          <p
            className={
              "font-sans text-[30px] font-medium leading-none tracking-[-0.01em]" +
              (sensitive ? ` ${SENSITIVE}` : "")
            }
            style={{ color: "var(--adm-ink)" }}
          >
            <CountUp value={value as string | number} />
          </p>
        )}
      </div>

      <div className="mt-1.5 flex min-h-[16px] items-baseline gap-1.5">
        {loading ? (
          <span aria-hidden className="adm-skeleton block" style={{ width: 64, height: 10 }} />
        ) : delta && hasValue && !error ? (
          <>
            <span className="font-sans text-[12px] leading-4" style={{ color: deltaColor(tone) }}>
              {deltaText(delta)}
            </span>
            {caption ? (
              <span className="font-sans text-[12px] leading-4" style={{ color: "var(--adm-ink-3)" }}>
                {caption}
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      <div ref={boxRef} className="mt-3 h-9 w-full">
        {loading ? (
          <span aria-hidden className="adm-skeleton block h-full w-full" />
        ) : trend && trend.length > 1 && hasValue && !error ? (
          <Sparkline data={trend} width={width} height={36} />
        ) : null}
      </div>
    </div>
  );
}

function PinGlyph({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12.5 2.5 17.5 7.5 13.8 9.3 12 15l-3.5-3.5L4 16l4.5-4.5L5 8l5.7-1.8z" />
    </svg>
  );
}
