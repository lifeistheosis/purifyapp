"use client";

// Hand-rolled SVG chart primitives. Zero external dependencies. All charts
// render at a fixed viewBox so they scale fluidly inside their container's
// CSS dimensions. Colours follow the existing dark-paper-on-night palette.
//
// Exported: Sparkline, LineChart, BarChart, Donut.

import { useState } from "react";

const GOLD = "rgb(212,175,55)";
const PAPER_DIM = "rgba(245,235,210,0.15)";
const PAPER_TEXT = "rgba(245,235,210,0.55)";
const PAPER_AXIS = "rgba(245,235,210,0.08)";

// ── Sparkline ───────────────────────────────────────────────────────────────
// Tiny inline trend line, no axes, no labels. Used on KPI cards.
export function Sparkline({
  data,
  width = 120,
  height = 32,
  color = GOLD,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!data.length) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const pts = data
    .map((v, i) => `${i * stepX},${height - ((v - min) / span) * height}`)
    .join(" ");
  const last = data[data.length - 1];
  const lastY = height - ((last - min) / span) * height;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
      <circle cx={(data.length - 1) * stepX} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
}

// Round a raw maximum up to a "nice" ceiling so axis ticks land on clean
// numbers (50, 100, 500, 1000, …) instead of arbitrary fractions of the
// raw peak. e.g. niceMax(385) = 500; niceMax(96) = 100; niceMax(3) = 5.
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / pow;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * pow;
}

// ── LineChart ───────────────────────────────────────────────────────────────
// Multi-series time-series. Each series gets its own colour; the X axis is
// implicit (one tick per data point); the Y axis spans 0 → niceMax(peak).
type Series = { name: string; color: string; data: number[] };

export function LineChart({
  series,
  labels,
  height = 220,
}: {
  series: Series[];
  labels?: string[];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 760;
  const padL = 36;
  const padR = 16;
  const padT = 12;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const all = series.flatMap((s) => s.data);
  if (!all.length) {
    return (
      <p className="font-sans text-[13px] text-paper/40 py-8 text-center">
        No data in range.
      </p>
    );
  }
  const axisMax = niceMax(Math.max(...all, 1));
  const count = Math.max(...series.map((s) => s.data.length));
  const stepX = count > 1 ? innerW / (count - 1) : 0;

  const pathFor = (data: number[]) =>
    data
      .map((v, i) => {
        const x = padL + i * stepX;
        const y = padT + innerH - (v / axisMax) * innerH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  // Tick fractions are listed top → bottom so they pair correctly with the
  // grid Y-coordinates (small Y = top in SVG). Labels read axisMax → 0.
  const tickFracs = [1, 0.75, 0.5, 0.25, 0];
  const grid = tickFracs.map((f) => padT + innerH * (1 - f));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const scaleX = width / rect.width;
          const xCss = e.clientX - rect.left;
          const x = xCss * scaleX - padL;
          if (x < 0 || x > innerW) {
            setHover(null);
            return;
          }
          const idx = Math.round(x / Math.max(stepX, 0.01));
          setHover(Math.max(0, Math.min(count - 1, idx)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Grid */}
        {grid.map((y, i) => (
          <line
            key={i}
            x1={padL}
            x2={width - padR}
            y1={y}
            y2={y}
            stroke={PAPER_AXIS}
            strokeWidth={1}
          />
        ))}
        {/* Y labels — top to bottom, axisMax → 0. */}
        {tickFracs.map((f, i) => (
          <text
            key={i}
            x={padL - 6}
            y={grid[i] + 3}
            fill={PAPER_TEXT}
            fontSize={9}
            textAnchor="end"
            fontFamily="ui-sans-serif, system-ui"
          >
            {Math.round(f * axisMax)}
          </text>
        ))}
        {/* X labels (sparse — first, middle, last) */}
        {labels?.length ? (
          [0, Math.floor((count - 1) / 2), count - 1].map((i) => (
            <text
              key={i}
              x={padL + i * stepX}
              y={height - 8}
              fill={PAPER_TEXT}
              fontSize={9}
              textAnchor={i === 0 ? "start" : i === count - 1 ? "end" : "middle"}
              fontFamily="ui-sans-serif, system-ui"
            >
              {labels[i]}
            </text>
          ))
        ) : null}
        {/* Series paths */}
        {series.map((s) => (
          <path
            key={s.name}
            d={pathFor(s.data)}
            stroke={s.color}
            strokeWidth={1.6}
            fill="none"
          />
        ))}
        {/* Hover marker */}
        {hover !== null && (
          <>
            <line
              x1={padL + hover * stepX}
              x2={padL + hover * stepX}
              y1={padT}
              y2={padT + innerH}
              stroke={PAPER_DIM}
              strokeWidth={1}
            />
            {series.map((s) => {
              const v = s.data[hover] ?? 0;
              const y = padT + innerH - (v / axisMax) * innerH;
              return (
                <circle
                  key={s.name}
                  cx={padL + hover * stepX}
                  cy={y}
                  r={3}
                  fill={s.color}
                />
              );
            })}
          </>
        )}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-2 px-2">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span
              className="inline-block h-[3px] w-4 rounded-full"
              style={{ background: s.color }}
            />
            <span className="font-sans text-[11px] text-paper/65 tabular-nums">
              {s.name}
              {hover !== null && (
                <>
                  {" · "}
                  <span className="text-paper font-semibold">
                    {s.data[hover] ?? 0}
                  </span>
                  {labels?.[hover] && (
                    <span className="text-paper/45"> · {labels[hover]}</span>
                  )}
                </>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BarChart ────────────────────────────────────────────────────────────────
// Horizontal bars. Used for top-N tables when the data wants a visual.
export function BarChart({
  rows,
  height = 220,
  accent = GOLD,
}: {
  rows: { label: string; value: number }[];
  height?: number;
  accent?: string;
}) {
  if (!rows.length) {
    return (
      <p className="font-sans text-[13px] text-paper/40 py-8 text-center">
        No data.
      </p>
    );
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-1.5" style={{ minHeight: height }}>
      {rows.map((r, i) => {
        const pct = (r.value / max) * 100;
        return (
          <div
            key={`${r.label}-${i}`}
            className="grid grid-cols-[1fr_auto] items-center gap-3"
          >
            <div className="relative h-6 rounded bg-paper/[0.04] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded"
                style={{ width: `${pct}%`, background: accent, opacity: 0.25 }}
              />
              <span className="absolute inset-0 px-2 flex items-center font-sans text-[12px] text-paper truncate">
                {r.label}
              </span>
            </div>
            <span className="font-sans text-[12px] text-paper/70 tabular-nums w-12 text-right">
              {r.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Donut ───────────────────────────────────────────────────────────────────
// Single-ring donut for ratios (anon vs signed-in, OAuth provider mix, etc).
export function Donut({
  segments,
  size = 140,
  label,
}: {
  segments: { name: string; value: number; color: string }[];
  size?: number;
  label?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  // Precompute cumulative offsets so the render path stays pure.
  const arcs = segments.map((s, i) => {
    const cumPrior = segments
      .slice(0, i)
      .reduce((a, x) => a + x.value / total, 0);
    return { ...s, offset: cumPrior * c, dash: `${(s.value / total) * c} ${c}` };
  });
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(245,235,210,0.06)"
          strokeWidth={10}
        />
        {arcs.map((s) => (
          <circle
            key={s.name}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={10}
            strokeDasharray={s.dash}
            strokeDashoffset={-s.offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
        {label && (
          <text
            x={size / 2}
            y={size / 2 + 4}
            textAnchor="middle"
            fill={PAPER_TEXT}
            fontSize={11}
            fontFamily="ui-sans-serif, system-ui"
          >
            {label}
          </text>
        )}
      </svg>
      <ul className="space-y-1.5">
        {segments.map((s) => (
          <li key={s.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="font-sans text-[12px] text-paper/80">
              {s.name}{" "}
              <span className="text-paper/45 tabular-nums">
                {Math.round((s.value / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Colour palette used across charts when a series doesn't bring its own.
export const SERIES_COLORS = [
  GOLD,
  "rgb(120,180,240)", // sky
  "rgb(220,120,120)", // rose
  "rgb(140,200,140)", // moss
  "rgb(200,160,220)", // lilac
  "rgb(240,180,120)", // amber
];
