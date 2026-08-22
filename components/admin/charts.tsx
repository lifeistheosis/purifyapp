"use client";

// Hand-rolled SVG chart primitives. Zero external dependencies.
//
// Visual contract:
//   - Every chart renders in a responsive SVG (viewBox-scaled to its
//     container's width) so the admin panel works on tablets.
//   - Axis text pulls from CSS variables (
//     --chart-axis) so a palette tweak in globals.css propagates.
//   - Hover state lives in React; pointer events are bound to a single
//     overlay rect so we don't pay an event handler per data point.
//
// Exports: Sparkline, LineChart, AreaChart, BarChart, Donut,
//          CalendarHeatmap, SERIES_COLORS, chartColors.

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

// Layout effect on the client, plain effect on the server, where there is no
// layout to read and useLayoutEffect only warns. The identity is chosen once
// per environment, never per render, so the hook order is stable.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ── Palette ─────────────────────────────────────────────────────────────────
// Semantic names so tabs can pick "positive" or "warning" without
// remembering hex codes. Bound to the same hues as the rest of the app.
// Two vocabularies, kept apart on purpose.
//
// `chartColors.positive/negative/warning` are STATUS: reserved for state,
// always shipped beside a word, never reused as "series 4".
//
// SERIES_COLORS is CATEGORICAL: identity only. The order is fixed and must
// not be reordered or cycled. The six DARK values were validated against the
// admin's dark surface for the OKLCH lightness band, a chroma floor,
// adjacent-pair colour-vision separation (worst adjacent deutan dE 9.0,
// above the 8.0 target) and contrast. The previous first series was a
// desaturated tan that failed the chroma floor outright, and red sat next to
// green, which is the single most common way a chart becomes unreadable to
// the ~8% of men with deuteranomaly.
//
// There are now two palettes. The light values in admin-theme.css are
// hue-matched to this order and contrast-checked individually, but they have
// NOT been through the same adjacent-pair CVD computation, because nothing in
// this repo can re-run it. Do not read the dE figure above as covering light.
// No baked fallbacks. These used to read var(--adm-s1, #b8892c) and so on,
// with the dark value as the fallback. That was a landmine the moment a light
// theme existed: any chart rendered outside .adm, or before the stylesheet
// resolved, would silently paint the dark palette onto a white card. Every
// one of these tokens is defined by app/admin/admin-theme.css on .adm, which
// is the only place charts are used.
export const chartColors = {
  primary: "var(--adm-s1)",
  accent: "var(--adm-accent)",
  info: "var(--adm-s2)",
  positive: "var(--adm-good)",
  negative: "var(--adm-critical)",
  warning: "var(--adm-warn)",
  lilac: "var(--adm-s4)",
};

export const SERIES_COLORS = [
  "var(--adm-s1)",
  "var(--adm-s2)",
  "var(--adm-s3)",
  "var(--adm-s4)",
  "var(--adm-s5)",
  "var(--adm-s6)",
];

// CSS-variable tokens. app/admin/admin-theme.css overrides all four of these
// inside .adm, per theme; globals.css holds the reader defaults.
// GRID was here, bound to --chart-grid. v5 removed every gridline in this
// file, so nothing reads it. The token itself stays defined in
// admin-theme.css and globals.css because the reader's own charts still use
// it; only the admin stopped drawing them.
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

// ── smoothPath ──────────────────────────────────────────────────────────────
// Catmull-Rom through the points, emitted as cubic beziers. Smooth without
// the overshoot a naive spline gives, which matters on a metric card where an
// invented dip below the axis would read as data.
//
// Lived privately in components/owner/ProjectionChart.tsx until v4, when the
// hero metric cards needed the same curve. One implementation, two callers.
/**
 * Reports the container's width, but only while it is narrow enough to matter.
 *
 * Every Cartesian chart in this file draws into a 1000-unit viewBox. That was
 * fine while `preserveAspectRatio="none"` stretched it, and it stayed fine on a
 * desktop where the card is ~1200px, but uniform scaling turned it into a
 * measurable defect on a phone: into a 305px card the scale is 0.305, so
 * `fontSize={10}` axis labels PAINT AT 3.05px and a 1.8 stroke paints at
 * 0.55px. Measured in the browser, not estimated. The sparklines beside them
 * paint at 11.44px because their viewBox is 280 and happens to match the card.
 *
 * So: below 640 the viewBox is set to the container's own width, which makes
 * the scale exactly 1 and every declared size land at its declared value. Above
 * it the hook returns null and the constant 1000 is used, so the desktop
 * geometry the panel was signed off on is byte-identical.
 *
 * Container width, not a viewport media query, because a chart's legibility is
 * a function of the box it is in. The same phone shows a full-bleed chart and a
 * half-width one, and a desktop sidebar can be narrower than a phone.
 */
function useNarrowWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [narrow, setNarrow] = useState<number | null>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setNarrow(w > 0 && w < 640 ? Math.round(w) : null);
    };
    // Measured HERE, synchronously, and not left to the observer. A
    // ResizeObserver callback is delivered during the rendering steps, so
    // first paint would land at the wrong scale and, in any environment that
    // does not composite, never correct itself. clientWidth forces layout and
    // reads it now; the observer below only handles LATER changes, which is
    // what it is actually good at.
    measure();
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    // Rotation, belt and braces: a resize event is a task and arrives even
    // where observer delivery is throttled.
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return [ref, narrow] as const;
}

export function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x} ${pts[0].y}` : "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    // 6 is the standard Catmull-Rom tension. Lower makes it wander.
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ` +
         `${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
  }
  return d;
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
  // useId, not a counter or a module constant. Two Sparklines sharing a
  // gradient id makes the second render with no fill, which is exactly the
  // bug that shipped in CartesianPlot (area-grad-0) and ProjectionChart
  // (own-grad) for months.
  const uid = useId().replace(/:/g, "");

  if (!data.length) {
    return <svg width={width} height={height} aria-hidden="true" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const xy = data.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / span) * height,
  }));
  // Curved, not angular. smoothPath has been exported from this file since
  // v4 and no chart inside it ever called it. The two components that did,
  // HeroSpark and ProjectionChart, are the two that never looked cheap.
  const line = smoothPath(xy);
  const area = `${line} L ${(data.length - 1) * stepX} ${height} L 0 ${height} Z`;
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
        <defs>
          <linearGradient id={`spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#spark-${uid})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={(data.length - 1) * stepX} cy={lastY} r={2.5} fill={color} />
        {interactive && hover !== null && (
          <circle
            cx={hover * stepX}
            cy={height - ((data[hover] - min) / span) * height}
            r={3}
            fill={color}
            stroke="var(--adm-bg)"
            strokeWidth={1.5}
          />
        )}
      </svg>
      {interactive && hover !== null && (
        <span
          // Tokens, not bg-night: on a light card the ground colour and the
          // panel colour are near-identical, so the tooltip needs the raised
          // surface and a real shadow or it reads as part of the plot.
          className="absolute -top-7 px-1.5 py-0.5 rounded-[var(--adm-radius-sm)] border font-sans text-eyebrow whitespace-nowrap pointer-events-none tabular-nums"
          style={{
            background: "var(--adm-panel)",
            borderColor: "var(--adm-line-strong)",
            color: "var(--adm-ink)",
            boxShadow: "var(--adm-shadow-pop)",
            left: Math.max(0, Math.min(width - 60, hover * stepX - 30)),
          }}
        >
          {data[hover]}
          {labels?.[hover] ? (
            <span className="text-[color:var(--adm-ink-3)]"> · {labels[hover]}</span>
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
  const uid = useId().replace(/:/g, "");
  const [boxRef, narrow] = useNarrowWidth();
  const width = narrow ?? 1000;
  // The gutter is for tick text. At scale 1 that text is 10px and needs about
  // 30 units; at 1000 units wide it was 44 because everything shrank together.
  const padL = narrow ? 32 : 44;
  const padR = 18;
  const padT = 14;
  const padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const all = series.flatMap((s) => s.data);
  if (!all.length) {
    return (
      <p className="font-sans text-detail text-[color:var(--adm-ink-3)] py-8 text-center">
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
    smoothPath(data.map((v, i) => ({ x: xFor(i), y: yFor(v) })));

  const areaPath = (data: number[]) => {
    if (!data.length) return "";
    const line = linePath(data);
    const baseY = padT + innerH;
    return `${line} L${xFor(data.length - 1).toFixed(1)},${baseY} L${xFor(0).toFixed(1)},${baseY} Z`;
  };

  // Tick fractions top → bottom. These position the Y LABELS only; the
  // gridlines they used to pair with are gone.
  //
  // Why the labels stay when the grid goes: a grid is a reading aid for
  // tracing a point back to an axis, and the hover crosshair below does
  // that job better and only when asked. An axis with no numbers at all is
  // decoration, and this chart is the analytical one.
  const tickFracs = [1, 0.75, 0.5, 0.25, 0];
  const grid = tickFracs.map((f) => padT + innerH * (1 - f));

  // X-axis labels: render up to 6 evenly spaced labels (first + last + 4
  // inside) so the axis reads cleanly on wide screens but isn't crowded.
  // hover when there is one, otherwise the latest reading. See the legend.
  const legendIdx = hover ?? count - 1;

  const xLabelIdxs = (() => {
    if (!labels?.length) return [] as number[];
    // Four labels, not six, once the axis is only ~250 units wide: six dates
    // at a real 10px collide, and a collided axis is worse than a sparse one.
    const targetCount = Math.min(narrow ? 4 : 6, count);
    if (targetCount <= 1) return [0];
    const out: number[] = [];
    for (let i = 0; i < targetCount; i++) {
      out.push(Math.round((i / (targetCount - 1)) * (count - 1)));
    }
    return [...new Set(out)];
  })();

  return (
    // Capped, because uniform scaling has a consequence the stretched version
    // did not. `w-full h-auto` on a 1000x240 viewBox grows the drawing until
    // maxHeight stops it, which happens at about 1200px wide; past that the
    // plot is a fixed island with dead card either side. The cap makes that
    // deliberate and centred rather than accidental and left-aligned.
    <div ref={boxRef} className="mx-auto w-full max-w-[1200px]">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        // preserveAspectRatio="none" was here. It stretched a 1000-unit
        // viewBox to whatever width the container happened to be, so a
        // 1.8px stroke rendered thinner horizontally than vertically and
        // every curve skewed. Uniform scaling costs nothing and is most of
        // the reason this chart used to look cheap.
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
                id={`area-${uid}-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
        )}

        {/* Y labels */}
        {tickFracs.map((f, i) => (
          <text
            key={i}
            x={padL - 8}
            y={grid[i] + 3}
            fill={AXIS}
            fontSize={10}
            textAnchor="end"
            fontFamily="var(--font-sans)"
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
                fontFamily="var(--font-sans)"
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
              fill={`url(#area-${uid}-${i})`}
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
                  stroke="var(--adm-bg)"
                  strokeWidth={1.5}
                />
              );
            })}
          </>
        )}
      </svg>

      {/* Legend.

          At rest this falls back to the LAST point rather than showing nothing.
          The values used to appear only while hovering, which on a touch screen
          means never: the legend was a colour key and the numbers it was built
          to carry were unreachable on a phone. Falling back to the most recent
          reading is also what ProjectionChart already does, so the two charts
          now agree. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 px-2">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span
              className="inline-block h-[3px] w-4 rounded-full"
              style={{ background: s.color }}
            />
            <span className="font-sans text-eyebrow text-[color:var(--adm-ink-2)] tabular-nums">
              {s.name}
              {legendIdx >= 0 && (
                <>
                  {" · "}
                  <span className="text-paper font-semibold">
                    {s.data[legendIdx] ?? 0}
                  </span>
                  {labels?.[legendIdx] && (
                    <span className="text-[color:var(--adm-ink-3)]"> · {labels[legendIdx]}</span>
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
      <p className="font-sans text-detail text-[color:var(--adm-ink-3)] py-8 text-center">
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
              className="font-sans text-caption text-[color:var(--adm-ink)] truncate"
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
            <span className="font-sans text-caption text-[color:var(--adm-ink-2)] tabular-nums w-12 text-right">
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
  const [boxRef, narrow] = useNarrowWidth();
  const width = narrow ?? 1000;
  const padL = narrow ? 32 : 44;
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
    <div ref={boxRef} className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        // See CartesianPlot: preserveAspectRatio="none" skewed every bar's
        // corner radius and cap. Uniform scaling instead.
        className="w-full h-auto"
        style={{ maxHeight: height * 1.4 }}
      >

        {tickFracs.map((f, i) => (
          <text
            key={i}
            x={padL - 8}
            y={grid[i] + 3}
            fill={AXIS}
            fontSize={10}
            textAnchor="end"
            fontFamily="var(--font-sans)"
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
                fontFamily="var(--font-sans)"
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
          stroke="var(--chart-empty)"
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
          fontFamily="var(--font-sans)"
          style={{ textTransform: "uppercase", letterSpacing: 1 }}
        >
          {centerName}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 12}
          textAnchor="middle"
          fill="var(--adm-ink)"
          fontSize={16}
          fontWeight={700}
          fontFamily="var(--font-sans)"
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
            <span className="font-sans text-caption text-[color:var(--adm-ink)]">
              {s.name}{" "}
              <span className="text-[color:var(--adm-ink-3)] tabular-nums">
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
              fontFamily="var(--font-sans)"
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
          className="absolute z-10 px-2 py-1 rounded-[var(--adm-radius-sm)] border font-sans text-eyebrow whitespace-nowrap pointer-events-none tabular-nums"
          style={
            {
              background: "var(--adm-panel)",
              borderColor: "var(--adm-line-strong)",
              color: "var(--adm-ink)",
              boxShadow: "var(--adm-shadow-pop)",
              top: hover.y - 30,
              left: hover.x - 50,
            } as CSSProperties
          }
        >
          <span className="text-[color:var(--adm-ink-2)]">{hover.date}</span>{" "}
          <span className="font-semibold">
            {hover.value.toLocaleString()} views
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 font-sans text-caption font-medium text-[color:var(--adm-ink-3)]">
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((a, i) => (
          <span
            key={i}
            className="inline-block rounded-[var(--adm-radius-sm)]"
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
