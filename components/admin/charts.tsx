"use client";

// Hand-rolled SVG chart primitives. Zero external dependencies.
//
// Visual contract:
//   - Every chart renders in a responsive SVG (viewBox-scaled to its
//     container's width) so the admin panel works on tablets.
//   - Gridlines + axis text pull from CSS variables (--chart-grid,
//     --chart-axis) so a palette tweak in globals.css propagates.
//   - Hover state lives in React; pointer events are bound to a single
//     overlay rect so we don't pay an event handler per data point.
//
// Exports: Sparkline, LineChart, AreaChart, BarChart, Donut,
//          CalendarHeatmap, SERIES_COLORS, chartColors.

import { useState, type CSSProperties } from "react";

// ── Palette ─────────────────────────────────────────────────────────────────
// Semantic names so tabs can pick "positive" or "warning" without
// remembering hex codes. Bound to the same hues as the rest of the app.
export const chartColors = {
  primary: "rgb(183,176,163)", // gold — the signature accent
  accent: "rgb(230,205,106)", // soft gold
  info: "rgb(120,180,240)", // sky
  positive: "rgb(120,200,150)", // moss / success
  negative: "rgb(220,120,120)", // rose / fail
  warning: "rgb(240,180,120)", // amber
  lilac: "rgb(200,160,220)",
};

export const SERIES_COLORS = [
  chartColors.primary,
  chartColors.info,
  chartColors.negative,
  chartColors.positive,
  chartColors.lilac,
  chartColors.warning,
];

// CSS-variable tokens — these resolve to the values defined in globals.css
// so a single palette change there flows everywhere.
const GRID = "var(--chart-grid)";
const AXIS = "var(--chart-axis)";
const HOVER = "var(--chart-hover)";

// ── niceMax ─────────────────────────────────────────────────────────────────
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

function formatTick(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

// ── Sparkline ───────────────────────────────────────────────────────────────
// Tiny inline trend line. Default mode: aria-hidden, no tooltip — the same
// decorative role it's had on KPI cards. Pass `interactive` to opt in to a
// hover marker and a small floating value pill.
export function Sparkline({
  data,
  labels,
  width = 120,
  height = 32,
  color = chartColors.primary,
  interactive = false,
}: {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  color?: string;
  interactive?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);

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

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xCss = e.clientX - rect.left;
    const x = (xCss / rect.width) * width;
    const idx = Math.round(x / Math.max(stepX, 0.01));
    setHover(Math.max(0, Math.min(data.length - 1, idx)));
  };

  return (
    <span className="relative inline-block" style={{ width, height }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden={!interactive}
        className="overflow-visible block"
        onMouseMove={interactive ? onMove : undefined}
        onMouseLeave={interactive ? () => setHover(null) : undefined}
      >
        <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
        <circle cx={(data.length - 1) * stepX} cy={lastY} r={2.5} fill={color} />
        {interactive && hover !== null && (
          <circle
            cx={hover * stepX}
            cy={height - ((data[hover] - min) / span) * height}
            r={3}
            fill={color}
            stroke="var(--color-night)"
            strokeWidth={1.5}
          />
        )}
      </svg>
      {interactive && hover !== null && (
        <span
          className="absolute -top-7 px-1.5 py-0.5 rounded-md bg-night border border-paper/15 font-sans text-eyebrow text-paper whitespace-nowrap pointer-events-none tabular-nums"
          style={{
            left: Math.max(0, Math.min(width - 60, hover * stepX - 30)),
          }}
        >
          {data[hover]}
          {labels?.[hover] ? (
            <span className="text-paper/50"> · {labels[hover]}</span>
          ) : null}
        </span>
      )}
    </span>
  );
}

// ── LineChart ───────────────────────────────────────────────────────────────
// Multi-series time-series. Responsive: the SVG keeps a 1000-unit-wide
// viewBox and scales to its parent's CSS width. Y axis is tick-labeled.
type Series = { name: string; color: string; data: number[] };

export function LineChart({
  series,
  labels,
  height = 240,
}: {
  series: Series[];
  labels?: string[];
  height?: number;
}) {
  return (
    <CartesianPlot
      series={series}
      labels={labels}
      height={height}
      mode="line"
    />
  );
}

// ── AreaChart ───────────────────────────────────────────────────────────────
// LineChart with a soft gradient under each series — meant for cumulative /
// growth views where the area below the line carries meaning. Shares the
// CartesianPlot helper so axis logic doesn't duplicate.
export function AreaChart({
  series,
  labels,
  height = 240,
}: {
  series: Series[];
  labels?: string[];
  height?: number;
}) {
  return (
    <CartesianPlot
      series={series}
      labels={labels}
      height={height}
      mode="area"
    />
  );
}

function CartesianPlot({
  series,
  labels,
  height,
  mode,
}: {
  series: Series[];
  labels?: string[];
  height: number;
  mode: "line" | "area";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 1000;
  const padL = 44;
  const padR = 18;
  const padT = 14;
  const padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const all = series.flatMap((s) => s.data);
  if (!all.length) {
    return (
      <p className="font-sans text-detail text-paper/40 py-8 text-center">
        No data in range.
      </p>
    );
  }
  const axisMax = niceMax(Math.max(...all, 1));
  const count = Math.max(...series.map((s) => s.data.length));
  const stepX = count > 1 ? innerW / (count - 1) : 0;

  const yFor = (v: number) => padT + innerH - (v / axisMax) * innerH;
  const xFor = (i: number) => padL + i * stepX;

  const linePath = (data: number[]) =>
    data
      .map(
        (v, i) =>
          `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`,
      )
      .join(" ");

  const areaPath = (data: number[]) => {
    if (!data.length) return "";
    const line = linePath(data);
    const baseY = padT + innerH;
    return `${line} L${xFor(data.length - 1).toFixed(1)},${baseY} L${xFor(0).toFixed(1)},${baseY} Z`;
  };

  // Tick fractions top → bottom so they pair with grid Y-coords.
  const tickFracs = [1, 0.75, 0.5, 0.25, 0];
  const grid = tickFracs.map((f) => padT + innerH * (1 - f));

  // X-axis labels: render up to 6 evenly spaced labels (first + last + 4
  // inside) so the axis reads cleanly on wide screens but isn't crowded.
  const xLabelIdxs = (() => {
    if (!labels?.length) return [] as number[];
    const targetCount = Math.min(6, count);
    if (targetCount <= 1) return [0];
    const out: number[] = [];
    for (let i = 0; i < targetCount; i++) {
      out.push(Math.round((i / (targetCount - 1)) * (count - 1)));
    }
    return [...new Set(out)];
  })();

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-auto"
        style={{ maxHeight: height * 1.2 }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const xCss = e.clientX - rect.left;
          const x = (xCss / rect.width) * width - padL;
          if (x < 0 || x > innerW) {
            setHover(null);
            return;
          }
          const idx = Math.round(x / Math.max(stepX, 0.01));
          setHover(Math.max(0, Math.min(count - 1, idx)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {/* Gradient defs for area fill */}
        {mode === "area" && (
          <defs>
            {series.map((s, i) => (
              <linearGradient
                key={`g-${i}`}
                id={`area-grad-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity={0.45} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
        )}

        {/* Grid */}
        {grid.map((y, i) => (
          <line
            key={i}
            x1={padL}
            x2={width - padR}
            y1={y}
            y2={y}
            stroke={GRID}
            strokeWidth={1}
          />
        ))}

        {/* Y labels */}
        {tickFracs.map((f, i) => (
          <text
            key={i}
            x={padL - 8}
            y={grid[i] + 3}
            fill={AXIS}
            fontSize={10}
            textAnchor="end"
            fontFamily="ui-sans-serif, system-ui"
          >
            {formatTick(f * axisMax)}
          </text>
        ))}

        {/* X labels */}
        {labels?.length
          ? xLabelIdxs.map((i, j) => (
              <text
                key={i}
                x={xFor(i)}
                y={height - 10}
                fill={AXIS}
                fontSize={10}
                textAnchor={
                  j === 0
                    ? "start"
                    : j === xLabelIdxs.length - 1
                      ? "end"
                      : "middle"
                }
                fontFamily="ui-sans-serif, system-ui"
              >
                {labels[i]}
              </text>
            ))
          : null}

        {/* Area fills (under the line) */}
        {mode === "area" &&
          series.map((s, i) => (
            <path
              key={`fill-${s.name}`}
              d={areaPath(s.data)}
              fill={`url(#area-grad-${i})`}
              stroke="none"
            />
          ))}

        {/* Series paths */}
        {series.map((s) => (
          <path
            key={s.name}
            d={linePath(s.data)}
            stroke={s.color}
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Hover marker */}
        {hover !== null && (
          <>
            <line
              x1={xFor(hover)}
              x2={xFor(hover)}
              y1={padT}
              y2={padT + innerH}
              stroke={HOVER}
              strokeWidth={1}
            />
            {series.map((s) => {
              const v = s.data[hover] ?? 0;
              return (
                <circle
                  key={s.name}
                  cx={xFor(hover)}
                  cy={yFor(v)}
                  r={3.5}
                  fill={s.color}
                  stroke="var(--color-night)"
                  strokeWidth={1.5}
                />
              );
            })}
          </>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 px-2">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span
              className="inline-block h-[3px] w-4 rounded-full"
              style={{ background: s.color }}
            />
            <span className="font-sans text-eyebrow text-paper/65 tabular-nums">
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
// Horizontal bars with a real axis. Default orientation is horizontal,
// which suits top-N tables (countries, paths, directives). A vertical
// option is here for compact "by day" rollups that pair next to a heatmap.
export function BarChart({
  rows,
  height = 240,
  accent = chartColors.primary,
  orientation = "horizontal",
}: {
  rows: { label: string; value: number }[];
  height?: number;
  accent?: string;
  orientation?: "horizontal" | "vertical";
}) {
  if (!rows.length) {
    return (
      <p className="font-sans text-detail text-paper/40 py-8 text-center">
        No data.
      </p>
    );
  }
  const max = Math.max(...rows.map((r) => r.value), 1);
  const niceCeiling = niceMax(max);

  if (orientation === "vertical") {
    return (
      <VerticalBars rows={rows} height={height} accent={accent} max={niceCeiling} />
    );
  }
  return (
    <HorizontalBars rows={rows} accent={accent} max={niceCeiling} />
  );
}

function HorizontalBars({
  rows,
  accent,
  max,
}: {
  rows: { label: string; value: number }[];
  accent: string;
  max: number;
}) {
  // We keep the table-like row layout (label column + bar + value) but
  // promote the bar to a tiny inline SVG so it sits on a baseline and
  // exposes a hover ring. Value labels appear inside the bar when there's
  // room (>40% width) and to the right otherwise.
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => {
        const pct = (r.value / max) * 100;
        const labelInside = pct > 38;
        return (
          <div
            key={`${r.label}-${i}`}
            className="grid grid-cols-[minmax(140px,1fr)_3fr_auto] items-center gap-3"
          >
            <span
              className="font-sans text-caption text-paper/85 truncate"
              title={r.label}
            >
              {r.label}
            </span>
            <div
              className="relative h-6 rounded bg-[color:var(--chart-empty)] overflow-hidden"
              title={`${r.label}: ${r.value}`}
            >
              <div
                className="absolute inset-y-0 left-0 rounded transition-[width] duration-300"
                style={{ width: `${pct}%`, background: accent, opacity: 0.32 }}
              />
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${pct}%`,
                  borderRight: `2px solid ${accent}`,
                }}
              />
              {labelInside && (
                <span className="absolute inset-y-0 left-2.5 flex items-center font-sans text-eyebrow font-semibold text-paper tabular-nums">
                  {r.value.toLocaleString()}
                </span>
              )}
            </div>
            <span className="font-sans text-caption text-paper/55 tabular-nums w-12 text-right">
              {labelInside ? "" : r.value.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VerticalBars({
  rows,
  height,
  accent,
  max,
}: {
  rows: { label: string; value: number }[];
  height: number;
  accent: string;
  max: number;
}) {
  const width = 1000;
  const padL = 44;
  const padR = 14;
  const padT = 14;
  const padB = 36;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const bw = (innerW / rows.length) * 0.62;
  const gap = (innerW / rows.length) * 0.38;
  const tickFracs = [1, 0.75, 0.5, 0.25, 0];
  const grid = tickFracs.map((f) => padT + innerH * (1 - f));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-auto"
        style={{ maxHeight: height * 1.4 }}
      >
        {grid.map((y, i) => (
          <line
            key={i}
            x1={padL}
            x2={width - padR}
            y1={y}
            y2={y}
            stroke={GRID}
          />
        ))}
        {tickFracs.map((f, i) => (
          <text
            key={i}
            x={padL - 8}
            y={grid[i] + 3}
            fill={AXIS}
            fontSize={10}
            textAnchor="end"
            fontFamily="ui-sans-serif, system-ui"
          >
            {formatTick(f * max)}
          </text>
        ))}
        {rows.map((r, i) => {
          const h = (r.value / max) * innerH;
          const x = padL + i * (bw + gap) + gap / 2;
          const y = padT + innerH - h;
          return (
            <g key={`${r.label}-${i}`}>
              <title>{`${r.label}: ${r.value}`}</title>
              <rect
                x={x}
                y={y}
                width={bw}
                height={h}
                rx={3}
                fill={accent}
                opacity={0.5}
              />
              <rect x={x} y={y} width={bw} height={2} fill={accent} />
              <text
                x={x + bw / 2}
                y={height - 14}
                fill={AXIS}
                fontSize={10}
                textAnchor="middle"
                fontFamily="ui-sans-serif, system-ui"
              >
                {r.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Donut ───────────────────────────────────────────────────────────────────
// Single-ring donut for ratios. Hover lifts a segment and the center
// updates to show the segment name + value.
export function Donut({
  segments,
  size = 160,
  label,
}: {
  segments: { name: string; value: number; color: string }[];
  size?: number;
  label?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const arcs = segments.map((s, i) => {
    const cumPrior = segments
      .slice(0, i)
      .reduce((a, x) => a + x.value / total, 0);
    return {
      ...s,
      offset: cumPrior * c,
      dash: `${(s.value / total) * c} ${c}`,
    };
  });

  const centerName = hover !== null ? segments[hover].name : (label ?? "Total");
  const centerValue =
    hover !== null
      ? `${segments[hover].value.toLocaleString()} · ${Math.round((segments[hover].value / total) * 100)}%`
      : total.toLocaleString();

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(245,235,210,0.06)"
          strokeWidth={11}
        />
        {arcs.map((s, i) => (
          <circle
            key={s.name}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={hover === i ? 14 : 11}
            strokeDasharray={s.dash}
            strokeDashoffset={-s.offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            style={{ transition: "stroke-width 120ms ease" }}
          />
        ))}
        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          fill={AXIS}
          fontSize={10}
          fontFamily="ui-sans-serif, system-ui"
          style={{ textTransform: "uppercase", letterSpacing: 1 }}
        >
          {centerName}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 12}
          textAnchor="middle"
          fill="var(--color-paper)"
          fontSize={16}
          fontWeight={700}
          fontFamily="ui-sans-serif, system-ui"
          className="tabular-nums"
        >
          {centerValue}
        </text>
      </svg>
      <ul className="space-y-1.5">
        {segments.map((s, i) => (
          <li
            key={s.name}
            className={
              "flex items-center gap-2 cursor-default transition-opacity " +
              (hover === null || hover === i ? "opacity-100" : "opacity-50")
            }
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: s.color }}
            />
            <span className="font-sans text-caption text-paper/85">
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

// ── CalendarHeatmap ─────────────────────────────────────────────────────────
// Pageviews-per-day grid for the last N weeks. Each cell is a square
// colored by value (gold gradient on the night background). Empty days
// stay paper-dim so a gap reads as "no traffic" not "missing data."
export function CalendarHeatmap({
  data,
  weeks = 12,
  cellSize = 14,
  gap = 3,
  accent = chartColors.primary,
}: {
  data: { date: string; value: number }[];
  weeks?: number;
  cellSize?: number;
  gap?: number;
  accent?: string;
}) {
  const [hover, setHover] = useState<{
    date: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  // Build a date → value map. Tolerant of upstream gaps.
  const byDate = new Map<string, number>();
  for (const d of data) byDate.set(d.date, d.value);

  // Start from today and walk backwards, snapping to Sunday so weeks
  // are aligned columns left-to-right (oldest → newest).
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dayOfWeek = today.getUTCDay(); // 0 Sun … 6 Sat
  const lastSunday = new Date(today);
  lastSunday.setUTCDate(today.getUTCDate() - dayOfWeek);
  const start = new Date(lastSunday);
  start.setUTCDate(lastSunday.getUTCDate() - 7 * (weeks - 1));

  // 7 rows × `weeks` columns. Each cell is a date.
  const cells: { date: string; value: number; row: number; col: number }[] = [];
  for (let col = 0; col < weeks; col++) {
    for (let row = 0; row < 7; row++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + col * 7 + row);
      if (d > today) continue;
      const date = d.toISOString().slice(0, 10);
      cells.push({ date, value: byDate.get(date) ?? 0, row, col });
    }
  }

  const max = Math.max(...cells.map((c) => c.value), 1);
  const intensity = (v: number) => {
    if (v <= 0) return 0;
    // log-ish bucketing keeps high outliers from making the rest invisible.
    return Math.min(1, Math.pow(v / max, 0.55));
  };

  const width = weeks * (cellSize + gap);
  const height = 7 * (cellSize + gap) + 22; // +22 for day labels at left
  const labelW = 22;

  return (
    <div className="relative w-fit">
      <svg
        width={width + labelW}
        height={height}
        viewBox={`0 0 ${width + labelW} ${height}`}
        aria-label="Pageviews per day, last 12 weeks"
      >
        {/* Row labels: Mon / Wed / Fri */}
        {["Mon", "Wed", "Fri"].map((lbl, i) => {
          const row = i === 0 ? 1 : i === 1 ? 3 : 5;
          return (
            <text
              key={lbl}
              x={0}
              y={row * (cellSize + gap) + cellSize - 2}
              fill={AXIS}
              fontSize={9}
              fontFamily="ui-sans-serif, system-ui"
            >
              {lbl}
            </text>
          );
        })}

        {cells.map((c) => {
          const a = intensity(c.value);
          return (
            <rect
              key={`${c.col}-${c.row}`}
              x={labelW + c.col * (cellSize + gap)}
              y={c.row * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={a === 0 ? "var(--chart-empty)" : accent}
              fillOpacity={a === 0 ? 1 : 0.2 + a * 0.7}
              stroke={a > 0 ? accent : "transparent"}
              strokeOpacity={0.25}
              onMouseEnter={() =>
                setHover({
                  date: c.date,
                  value: c.value,
                  x: labelW + c.col * (cellSize + gap) + cellSize / 2,
                  y: c.row * (cellSize + gap),
                })
              }
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "default" }}
            />
          );
        })}
      </svg>

      {hover && (
        <div
          className="absolute z-10 px-2 py-1 rounded-md bg-night border border-paper/15 font-sans text-eyebrow text-paper whitespace-nowrap pointer-events-none tabular-nums shadow"
          style={
            {
              top: hover.y - 30,
              left: hover.x - 50,
            } as CSSProperties
          }
        >
          <span className="text-paper/55">{hover.date}</span>{" "}
          <span className="font-semibold">
            {hover.value.toLocaleString()} views
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 font-sans text-eyebrow text-paper/45 uppercase tracking-[1px]">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((a, i) => (
          <span
            key={i}
            className="inline-block rounded-sm"
            style={{
              width: cellSize,
              height: cellSize,
              background: a === 0 ? "var(--chart-empty)" : accent,
              opacity: a === 0 ? 1 : 0.2 + a * 0.7,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
