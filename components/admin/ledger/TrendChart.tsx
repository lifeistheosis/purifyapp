"use client";

import { useId, useState, type ReactNode } from "react";

import { useReducedMotion } from "@/lib/ui/motion";
import { SENSITIVE } from "@/lib/admin/streamer";
import { deltaColor, deltaText, deltaTone, type DeltaSpec } from "@/lib/admin/ledger/delta";
import {
  nearestIndex,
  pathLength,
  polyline,
  project,
  sharedDomain,
  yTicks,
} from "@/lib/admin/ledger/sparkline";
import { CountUp } from "./CountUp";
import { useWidth } from "./useWidth";

/**
 * The Summary's chart card.
 *
 * A title, the current value, its delta, and one accent line over a soft
 * fill. Optionally a compare series in muted ink, dashed. Two or three y ticks
 * on the left, first and last labels underneath. Hover is a hairline vertical
 * cursor and a small tooltip.
 *
 * Restyled 2026-09-13 to the panel's restored themes and card. v1.4 drew it
 * as a plain ink line on a flat hairline card with no fill; the layout and
 * the behaviour are unchanged.
 *
 * 220px tall on desktop, 160 on a phone (the md: class pair). The width is
 * measured so the line is drawn in pixels and its dash length is exact.
 */
export type TrendChartProps = {
  title: string;
  value?: string | number | null;
  delta?: DeltaSpec;
  points: number[];
  /** One per point. Shown in the tooltip and as the two end labels. */
  labels?: string[];
  compare?: number[];
  compareLabel?: string;
  format?: (v: number) => string;
  sensitive?: boolean;
  loading?: boolean;
  error?: string;
  empty?: string;
  emptyHref?: { href: string; label: string };
  /** A control in the header, e.g. the MRR / DAU toggle. */
  action?: ReactNode;
};

const Y_GUTTER = 44;
const X_PAD = 4;
const BOTTOM = 18;

export function TrendChart({
  title,
  value,
  delta,
  points,
  labels,
  compare,
  compareLabel,
  format = (v) => v.toLocaleString("en-US"),
  sensitive,
  loading,
  error,
  empty = "Nothing in this range yet.",
  emptyHref,
  action,
}: TrendChartProps) {
  const [boxRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const hasValue = value !== null && value !== undefined && value !== "";
  const tone = delta ? deltaTone(delta) : "flat";

  return (
    <div
      className="flex min-w-0 flex-col rounded-[var(--adm-radius)] border p-4"
      // The panel's own card, restored 2026-09-13 with the two themes: the
      // panel ground with the theme's card shadow, which is none on dark and
      // real on light. v1.4 drew this flat, on a hairline only.
      style={{ background: "var(--adm-panel)", borderColor: "var(--adm-line)", boxShadow: "var(--adm-shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-sans text-[13px] font-semibold leading-tight" style={{ color: "var(--adm-ink)" }}>
            {title}
          </h3>
          <div className="mt-1.5 flex items-baseline gap-2">
            {loading ? (
              <span aria-hidden className="adm-skeleton block" style={{ width: 96, height: 24 }} />
            ) : hasValue && !error ? (
              <>
                <span
                  className={
                    "font-sans text-[24px] font-semibold leading-none tracking-[-0.02em]" +
                    (sensitive ? ` ${SENSITIVE}` : "")
                  }
                  style={{ color: "var(--adm-ink)" }}
                >
                  <CountUp value={value as string | number} />
                </span>
                {delta ? (
                  <span
                    className={"font-sans text-[12px]" + (sensitive ? ` ${SENSITIVE}` : "")}
                    style={{ color: deltaColor(tone) }}
                  >
                    {deltaText(delta)}
                  </span>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div
        ref={boxRef}
        className={
          "relative mt-3 h-[160px] w-full md:h-[220px]" + (sensitive ? ` ${SENSITIVE}` : "")
        }
      >
        {loading ? (
          <span aria-hidden className="adm-skeleton block h-full w-full" />
        ) : error ? (
          <p className="pt-8 text-center font-sans text-[12.5px]" style={{ color: "var(--adm-down)" }}>
            {error}
          </p>
        ) : points.length < 2 ? (
          <p className="pt-8 text-center font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
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
        ) : width > 0 ? (
          <Plot
            width={width}
            points={points}
            labels={labels}
            compare={compare}
            compareLabel={compareLabel}
            format={format}
            hover={hover}
            setHover={setHover}
            reduced={reduced}
          />
        ) : null}
      </div>
    </div>
  );
}

function Plot({
  width,
  points,
  labels,
  compare,
  compareLabel,
  format,
  hover,
  setHover,
  reduced,
}: {
  width: number;
  points: number[];
  labels?: string[];
  compare?: number[];
  compareLabel?: string;
  format: (v: number) => string;
  hover: number | null;
  setHover: (i: number | null) => void;
  reduced: boolean;
}) {
  // url(#id) cannot take the colons React puts in its ids.
  const fillId = `trend-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  // The plot's height is the box's, read through a CSS-driven pair. The
  // SVG fills the box; the geometry is computed for the same two heights
  // the classes set, chosen by the same breakpoint the classes use.
  const tall = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
  const height = tall ? 220 : 160;
  const plotW = Math.max(0, width - Y_GUTTER - X_PAD);
  const plotH = height - BOTTOM;
  const domain = sharedDomain(points, compare);
  const main = project(points, { width: plotW, height: plotH, pad: 4 }, domain);
  const cmp = compare && compare.length > 1 ? project(compare, { width: plotW, height: plotH, pad: 4 }, domain) : null;
  const mainD = polyline(main);
  const mainLen = pathLength(main);
  const ticks = yTicks(domain, height);
  const yFor = (v: number) => {
    const p = project([v], { width: plotW, height: plotH, pad: 4 }, domain);
    return p[0]?.y ?? 0;
  };

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left - Y_GUTTER;
    setHover(nearestIndex(x, plotW, points.length));
  };

  const hi = hover;
  const hx = hi !== null ? main[hi].x + Y_GUTTER : 0;
  const tipLeft = hi !== null ? Math.max(0, Math.min(width - 150, hx - 60)) : 0;

  return (
    <>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block cursor-crosshair overflow-visible"
        role="img"
        aria-label={`${points.length} points, ${format(points[0])} to ${format(points[points.length - 1])}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {/* Ticks: a label and a hairline each. No grid beyond that. */}
        {ticks.map((t) => (
          <g key={t}>
            <text
              x={Y_GUTTER - 8}
              y={yFor(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={11}
              fontFamily="var(--font-sans)"
              fill="var(--adm-ink-3)"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {format(t)}
            </text>
            <line x1={Y_GUTTER} x2={width - X_PAD} y1={yFor(t)} y2={yFor(t)} stroke="var(--chart-grid)" strokeWidth={1} />
          </g>
        ))}

        {labels && labels.length === points.length ? (
          <>
            <text x={Y_GUTTER} y={height - 4} fontSize={11} fontFamily="var(--font-sans)" fill="var(--adm-ink-3)">
              {labels[0]}
            </text>
            <text x={width - X_PAD} y={height - 4} textAnchor="end" fontSize={11} fontFamily="var(--font-sans)" fill="var(--adm-ink-3)">
              {labels[labels.length - 1]}
            </text>
          </>
        ) : null}

        <g transform={`translate(${Y_GUTTER} 0)`}>
          {/* The accent line over a soft fill, the way the panel's charts
              drew before v1.4 put them in plain ink. */}
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--adm-accent-line)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="var(--adm-accent-line)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {main.length > 1 ? (
            <path
              d={`${mainD} L ${main[main.length - 1].x} ${plotH} L ${main[0].x} ${plotH} Z`}
              fill={`url(#${fillId})`}
              stroke="none"
            />
          ) : null}
          {cmp ? (
            <path
              d={polyline(cmp)}
              fill="none"
              stroke="var(--adm-ink-3)"
              strokeDasharray="3 3"
              className="adm-draw-static"
              style={{ strokeWidth: 1.25 }}
            />
          ) : null}
          <path
            d={mainD}
            fill="none"
            stroke="var(--adm-accent-line)"
            strokeLinejoin="round"
            strokeLinecap="round"
            className={reduced ? "adm-draw-static" : "adm-draw"}
            style={{
              strokeWidth: 2,
              ["--adm-len" as string]: `${Math.ceil(mainLen)}`,
            }}
          />
          {hi !== null ? (
            <line
              x1={main[hi].x}
              x2={main[hi].x}
              y1={0}
              y2={plotH}
              stroke="var(--chart-hover)"
              strokeWidth={1}
            />
          ) : null}
        </g>
      </svg>

      {hi !== null ? (
        <div
          role="status"
          className="pointer-events-none absolute top-0 rounded-[var(--adm-radius-sm)] border px-2 py-1 font-sans text-[12px] leading-snug"
          style={{
            left: tipLeft,
            background: "var(--adm-panel-2)",
            borderColor: "var(--adm-line)",
            color: "var(--adm-ink)",
            fontVariantNumeric: "tabular-nums",
            boxShadow: "var(--adm-shadow-pop)",
          }}
        >
          {labels?.[hi] ? (
            <span className="block" style={{ color: "var(--adm-ink-3)" }}>
              {labels[hi]}
            </span>
          ) : null}
          <span className="block">{format(points[hi])}</span>
          {compare && compare[hi] !== undefined ? (
            <span className="block" style={{ color: "var(--adm-ink-2)" }}>
              {compareLabel ? `${compareLabel} ` : ""}
              {format(compare[hi])}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
