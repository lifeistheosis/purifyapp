"use client";

import { useId, useState, type ReactNode } from "react";

import { SENSITIVE } from "@/lib/admin/streamer";
import { deltaColor, deltaText, deltaTone, type DeltaSpec } from "@/lib/admin/ledger/delta";
import { HeroSpark } from "../hero";
import { CountUp } from "./CountUp";

/**
 * One number, with its name, its change, and its shape.
 *
 * RESTYLED 2026-09-13 to the panel's own card, the one MetricCard draws on
 * the hero row: the panel ground with the theme's card shadow, the 30px
 * semibold figure, the change with its arrow, and the tall accent sparkline
 * with its fill and readout. v1.4 drew this as the Ledger tile, a flat white
 * card on a hairline with a 36px ink line, and the owner kept the v1.4 layout
 * but not that card. What the tile DOES is unchanged: the pin, the info
 * sentence, the four states and the streamer masking.
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
  /**
   * How a trend point reads in the sparkline's readout. The trends arrive in
   * whatever unit the source keeps, cents for money, so a money tile must
   * pass this or the readout prints 4520 where it means $45.
   */
  trendFormat?: (v: number) => string;
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
  trendFormat,
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
  const [infoOpen, setInfoOpen] = useState(false);
  const infoId = useId();
  // The sparkline's gradient is referenced as url(#id), and React's ids carry
  // characters a url() fragment cannot, so only the safe ones are kept.
  const sparkId = `kpi-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const hasValue = value !== null && value !== undefined && value !== "";
  const tone = delta ? deltaTone(delta) : "flat";

  return (
    <div
      className="group relative flex min-w-0 flex-col rounded-[var(--adm-radius)] border p-4"
      style={{
        background: "var(--adm-panel)",
        borderColor: "var(--adm-line)",
        // None on dark, where the surface step separates the card; a real
        // shadow on light, where a white card on near-white needs one.
        boxShadow: "var(--adm-shadow-card)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate font-sans text-[13px] font-medium leading-4" style={{ color: "var(--adm-ink)" }}>
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
                    boxShadow: "var(--adm-shadow-pop)",
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
              style={{ color: pinned ? "var(--adm-accent-line)" : "var(--adm-ink-3)" }}
            >
              <PinGlyph filled={!!pinned} />
            </button>
          ) : pinned ? (
            <span className="grid h-6 w-6 place-items-center" style={{ color: "var(--adm-accent-line)" }} aria-label="Pinned">
              <PinGlyph filled />
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 min-h-[30px]">
        {loading ? (
          <span aria-hidden className="adm-skeleton block" style={{ width: "58%", height: 30 }} />
        ) : error ? (
          <p className="font-sans text-[12.5px] leading-snug" style={{ color: "var(--adm-critical)" }}>
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
              "font-sans text-[30px] font-semibold leading-none tracking-[-0.02em]" +
              (sensitive ? ` ${SENSITIVE}` : "")
            }
            style={{ color: "var(--adm-ink)" }}
          >
            <CountUp value={value as string | number} />
          </p>
        )}
      </div>

      <div className="mt-2 flex min-h-[16px] items-center gap-1.5">
        {loading ? (
          <span aria-hidden className="adm-skeleton block" style={{ width: 64, height: 10 }} />
        ) : delta && hasValue && !error ? (
          <>
            {/* The delta masks with the value. "+300%" on a revenue tile is
                the revenue story told without the number, which is what the
                mode exists to keep off a stream. The caption beside it only
                names the comparison, so it stays readable.

                Direction gets a colour AND an arrow, as it does on the hero
                cards, so the sign never rests on colour alone. */}
            <span
              className={"flex items-center gap-1 font-sans text-[12px] leading-4" + (sensitive ? ` ${SENSITIVE}` : "")}
              style={{ color: deltaColor(tone) }}
            >
              {tone !== "flat" ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {tone === "up" ? <path d="M5 8V2M2.2 4.8 5 2l2.8 2.8" /> : <path d="M5 2v6M2.2 5.2 5 8l2.8-2.8" />}
                </svg>
              ) : null}
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

      {/* A chart of money is money, so the whole box masks, readout included.
          Hover lifts it, like every other mask. */}
      <div className={"mt-3 min-h-[78px]" + (sensitive ? ` ${SENSITIVE}` : "")}>
        {loading ? (
          <span aria-hidden className="adm-skeleton block w-full" style={{ height: 78 }} />
        ) : trend && trend.length > 1 && hasValue && !error ? (
          <HeroSpark
            points={trend}
            color="var(--adm-accent-line)"
            format={trendFormat}
            title={label}
            id={sparkId}
          />
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
