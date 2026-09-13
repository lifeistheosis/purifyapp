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
// Exports: Sparkline, LineChart, AreaChart (a LineChart now), BarChart,
//          SegmentList (what the Donut became), CalendarHeatmap,
//          SERIES_COLORS, chartColors.
//
// THE LEDGER RULES, since 2026-09-05. A chart is at most two lines: the
// first in ink at --adm-chart-line, the second in muted ink, dashed. No area
// fill, no gradient, no dot at the end or under the cursor; the cursor is a
// hairline. A chart asked to draw three or more series draws them as small
// multiples, one line per plot, so every series is still on screen and no
// plot ever carries a third line. Donut and pie are gone: a share is a list.

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import { useReducedMotion } from "@/lib/ui/motion";
import { StatList } from "./ledger/StatList";

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
  positive: "var(--adm-up)",
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
//
// GRID is back. v5 removed every gridline in this file on the argument that
// the hover crosshair traces a point to its axis better and only when asked.
// That is true of a POINT and false of a SHAPE: with nothing behind it the
// plot floats, and the eye has no fixed reference to judge one peak against
// another, or against the same chart a moment ago. It matters more now that
// the y-scale animates, because a zoom against a blank field reads as the
// data moving rather than the scale changing. The grid is what the zoom moves
// against, which is why it deliberately does NOT scale with the plot.
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

//
// MONOTONE, NOT CATMULL-ROM, since 2026-09-06. Catmull-Rom is smooth but it is
// not shape-preserving: a flat zero baseline with one $19 day in it curled
// BELOW the axis on either side of the spike, and the daily revenue chart
// showed dips to about minus two dollars on days nothing happened. The owner
// read them as refunds. Fritsch-Carlson monotone cubic interpolation limits
// each tangent so the curve between two points never leaves the range of
// those two points: a run of zeros stays exactly on zero, a spike rises and
// falls without ringing, and nothing the data does not say is drawn.
export function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x} ${pts[0].y}` : "";
  const n = pts.length;
  // Secant slopes between neighbours. A repeated x (two points on top of each
  // other) would divide by zero; treat that interval as flat.
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = pts[i + 1].x - pts[i].x;
    dx.push(h);
    m.push(h !== 0 ? (pts[i + 1].y - pts[i].y) / h : 0);
  }
  // Tangents: zero wherever the slope changes sign or an interval is flat, so
  // every local extreme in the data is a real extreme of the curve.
  const t: number[] = new Array(n).fill(0);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  }
  // Fritsch-Carlson limiter: keep each tangent inside the circle of radius 3
  // around the secant so the segment cannot overshoot.
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const h = dx[i];
    d += ` C ${p1.x + h / 3} ${p1.y + (t[i] * h) / 3}, ` +
         `${p2.x - h / 3} ${p2.y - (t[i + 1] * h) / 3}, ${p2.x} ${p2.y}`;
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
  color = "var(--adm-ink)",
  interactive = false,
}: {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  /** A token. The ledger draws in ink; the second of two lines in muted ink. */
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
  const xy = data.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / span) * height,
  }));
  const line = smoothPath(xy);

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
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeLinecap="butt"
          strokeLinejoin="round"
          style={{ strokeWidth: "var(--adm-chart-line)" }}
        />
        {interactive && hover !== null && (
          <line
            x1={hover * stepX}
            x2={hover * stepX}
            y1={0}
            y2={height}
            stroke={HOVER}
            strokeWidth={1}
          />
        )}
      </svg>
      {interactive && hover !== null && (
        <span
          // Ink on cream, on a hairline.
          className="absolute -top-7 px-1.5 py-0.5 rounded-[var(--adm-radius-sm)] border font-sans text-eyebrow whitespace-nowrap pointer-events-none tabular-nums"
          style={{
            background: "var(--adm-panel-2)",
            borderColor: "var(--adm-line)",
            color: "var(--adm-ink)",
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
  // Three or more series are small multiples: one plot per series, stacked,
  // each at a share of the height with a floor so a line still has room to
  // be a line. Every series stays on screen; no plot carries a third line.
  if (series.length > 2) {
    const each = Math.max(120, Math.round(height / series.length));
    return (
      <div className="flex flex-col gap-3">
        {series.map((s) => (
          <div key={s.name}>
            <p className="mb-1 px-2 font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
              {s.name}
            </p>
            <CartesianPlot series={[s]} labels={labels} height={each} />
          </div>
        ))}
      </div>
    );
  }
  return <CartesianPlot series={series} labels={labels} height={height} />;
}

// ── AreaChart ───────────────────────────────────────────────────────────────
// Kept as a name so the tabs that call it keep compiling. It is a LineChart:
// the area fill and its gradient are gone with the Ledger.
export function AreaChart(props: { series: Series[]; labels?: string[]; height?: number }) {
  return <LineChart {...props} />;
}

function CartesianPlot({
  series,
  labels,
  height,
}: {
  series: Series[];
  labels?: string[];
  height: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const reduced = useReducedMotion();
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
  // Computed BEFORE the empty-state return, because the zoom hook below must
  // run on every render and a hook after a conditional return does not.
  // Math.max(...[], 1) is 1, so this is safe on an empty series.
  const axisMax = niceMax(Math.max(...all, 1));

  // ── The zoom ──────────────────────────────────────────────────────────────
  // Toggling a series off can drop the ceiling from 10k to 200, and toggling
  // it back on raises it again. Snapping between the two is a jump cut: every
  // curve on screen changes height at once and the eye reads it as the DATA
  // moving, which is the one thing it must never read as.
  //
  // So the plot is drawn at the NEW scale, always and immediately, and a
  // transform makes it momentarily look like the OLD one before animating
  // that transform away. The geometry is exact rather than eyeballed. With
  // base at the axis line, a value's distance above it is (v / max) * innerH,
  // so the same drawing at two different maxima differs by a pure vertical
  // scale about that base of k = maxNew / maxOld. Raising the ceiling gives
  // k > 1: the curves start stretched to their old height and settle down,
  // which is a zoom OUT. Lowering it gives k < 1 and the reverse.
  //
  // A CSS @keyframes with only a `from`, not a transition, and no fill-mode.
  // The rest state is therefore the element's own untransformed geometry,
  // which is the truth. Exactly as in components/admin/Odometer.tsx: an
  // animation that is skipped, throttled, or never fires at all still leaves
  // the correct picture on screen. A transition would have to be armed one
  // frame after a change, and a frame callback that does not fire in a
  // background tab would leave the plot resting at the WRONG scale.
  // State, not a ref, and set during render on purpose. This is React's
  // documented way to adjust state when a prop changes: the set call is
  // detected before anything commits, so it re-renders in place rather than
  // painting once and correcting. A ref would be the obvious tool and is the
  // wrong one, because reading ref.current during render is exactly what
  // react-hooks/refs forbids and what makes a component miss an update.
  //
  // Held rather than recomputed each render so that an unrelated re-render,
  // hovering the plot, cannot clear k halfway through and cancel a zoom that
  // is already playing.
  const [zoom, setZoom] = useState<{ max: number; k: number | null }>({
    max: axisMax,
    k: null,
  });
  if (zoom.max !== axisMax) {
    setZoom({ max: axisMax, k: axisMax / zoom.max });
  }
  const zoomK = reduced ? null : zoom.k;

  if (!all.length) {
    return (
      <p className="font-sans text-detail text-[color:var(--adm-ink-3)] py-8 text-center">
        No data in range.
      </p>
    );
  }

  const count = Math.max(...series.map((s) => s.data.length));
  const stepX = count > 1 ? innerW / (count - 1) : 0;

  const yFor = (v: number) => padT + innerH - (v / axisMax) * innerH;
  // A LONE POINT GOES IN THE MIDDLE, not hard against the axis. With count 1
  // stepX is 0, so every index mapped to padL and the single reading sat on
  // the y-axis looking like a rendering fault rather than a datum.
  const xFor = (i: number) =>
    count === 1 ? padL + innerW / 2 : padL + i * stepX;

  const linePath = (data: number[]) =>
    smoothPath(data.map((v, i) => ({ x: xFor(i), y: yFor(v) })));

  // Tick fractions top → bottom. These position the Y LABELS only; the
  // gridlines they used to pair with are gone.
  //
  // Why the labels stay when the grid goes: a grid is a reading aid for
  // tracing a point back to an axis, and the hover crosshair below does
  // that job better and only when asked. An axis with no numbers at all is
  // decoration, and this chart is the analytical one.
  const tickFracs = [1, 0.5, 0];
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

        {/* Y labels. The numbers themselves change when the scale does, so
            they cross-fade rather than snapping to new values mid-zoom. They
            are not inside the zoom group: scaling text vertically would
            stretch the glyphs. */}
        {tickFracs.map((f, i) => (
          <text
            key={`${axisMax}-${i}`}
            style={
              zoomK != null
                ? { animation: "adm-chart-tick-in 620ms ease-out" }
                : undefined
            }
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

        {/* The grid, behind everything and OUTSIDE the zoom group.
            It is the fixed frame the plot moves against; scaling it with the
            data would cancel the zoom out visually and leave a chart that
            looks identical before and after a scale change.

            The baseline is drawn at the axis colour rather than the grid
            colour: it is the zero line, which is a fact about the data, while
            the rest are a reading aid. */}
        <g aria-hidden>
          {grid.map((y, i) => (
            <line
              key={`h-${i}`}
              x1={padL}
              x2={padL + innerW}
              y1={y}
              y2={y}
              stroke={i === grid.length - 1 ? AXIS : GRID}
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          ))}
        </g>

        {/* Everything that is drawn AT the current scale, and therefore
            everything the zoom applies to. Keyed on axisMax so a scale change
            remounts it and the animation runs again from the top; React does
            not restart an animation whose name did not change. */}
        <g
          key={`zoom-${axisMax}`}
          style={
            zoomK != null
              ? ({
                  // view-box, so the origin below is in viewBox units rather
                  // than relative to this group's own bounding box, which
                  // changes shape with the data and would move the pivot.
                  transformBox: "view-box",
                  transformOrigin: `0px ${padT + innerH}px`,
                  ["--adm-zoom-k" as string]: String(zoomK),
                  animation: "adm-chart-zoom 620ms cubic-bezier(0.22, 0.9, 0.24, 1)",
                } as CSSProperties)
              : undefined
          }
        >
        {/* Series paths. The first is the ink line; the second, when there
            is one, is the compare: muted, 1px, dashed. s.color is ignored on
            purpose: a chart has two tones and the series index picks. */}
        {series.map((s, i) => (
          <path
            key={s.name}
            d={linePath(s.data)}
            stroke={i === 0 ? "var(--adm-ink)" : "var(--adm-ink-2)"}
            strokeDasharray={i === 0 ? undefined : "4 4"}
            fill="none"
            strokeLinecap="butt"
            strokeLinejoin="round"
            style={{ strokeWidth: i === 0 ? "var(--adm-chart-line)" : 1 }}
          />
        ))}

        {/* A SINGLE READING IS DRAWN AS A DOT, because it cannot be drawn as a
            line. smoothPath returns a bare `M x y` for one point and a moveto
            with no drawing command paints nothing at all, so a chart with one
            month of data rendered its axes, its grid, its legend and no data:
            indistinguishable from a bug, and the reason the revenue chart
            looked broken on a shop with a single month of orders.

            Not joined up to anything, and deliberately: one reading is a
            value, not a trend, and drawing a flat line across the full width
            would assert a period the data does not cover. */}
        {series
          .filter((s) => s.data.length === 1)
          .map((s, i) => (
            <line
              key={`tick-${s.name}`}
              x1={xFor(0) - 6}
              x2={xFor(0) + 6}
              y1={yFor(s.data[0])}
              y2={yFor(s.data[0])}
              stroke={i === 0 ? "var(--adm-ink)" : "var(--adm-ink-2)"}
              strokeWidth={2}
            />
          ))}

        {/* Hover marker */}
        {hover !== null && (
          <line
            x1={xFor(hover)}
            x2={xFor(hover)}
            y1={padT}
            y2={padT + innerH}
            stroke={HOVER}
            strokeWidth={1}
          />
        )}
        </g>
      </svg>

      {/* Legend.

          At rest this falls back to the LAST point rather than showing nothing.
          The values used to appear only while hovering, which on a touch screen
          means never: the legend was a colour key and the numbers it was built
          to carry were unreachable on a phone. Falling back to the most recent
          reading is also what ProjectionChart already does, so the two charts
          now agree. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 px-2">
        {series.map((s, i) => (
          <div key={s.name} className="flex items-center gap-2">
            <svg width="16" height="4" aria-hidden>
              <line x1="0" x2="16" y1="2" y2="2" stroke={i === 0 ? "var(--adm-ink)" : "var(--adm-ink-2)"} strokeWidth={i === 0 ? 1.5 : 1} strokeDasharray={i === 0 ? undefined : "3 3"} />
            </svg>
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

// ── SegmentList ─────────────────────────────────────────────────────────────
// What the Donut became. A share of a whole is a list of rows: the name,
// the value, and its share, in the ink, on hairlines. The prop shape is the
// Donut's so the seven call sites changed by name only. `color` is accepted
// and ignored: the rows have no hue.
export function SegmentList({
  segments,
  label,
  format = (v) => v.toLocaleString("en-US"),
}: {
  segments: { name: string; value: number; color?: string }[];
  /** What the total is a total of, e.g. "sessions". */
  label?: string;
  format?: (v: number) => string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  const rows = segments.map((s) => ({
    id: s.name,
    label: s.name,
    value: total > 0 ? `${format(s.value)} · ${Math.round((s.value / total) * 100)}%` : format(s.value),
  }));
  return (
    <div>
      <StatList rows={rows} empty="Nothing to share out yet." />
      {label ? (
        <p className="mt-2 px-1 font-sans text-[12px]" style={{ color: "var(--adm-ink-3)", fontVariantNumeric: "tabular-nums" }}>
          {format(total)} {label}
        </p>
      ) : null}
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
  label = "Pageviews",
}: {
  data: { date: string; value: number }[];
  weeks?: number;
  cellSize?: number;
  gap?: number;
  accent?: string;
  /** What is being counted, for the accessible name. Defaults to the one thing
   *  this chart was originally built for, so existing call sites are unchanged. */
  label?: string;
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
        // Built from the prop rather than hardcoded. This read "last 12 weeks"
        // regardless of what was passed, so <CalendarHeatmap weeks={8} />
        // announced the wrong span to a screen reader while showing the right
        // one to everyone else.
        aria-label={`${label} per day, last ${weeks} week${weeks === 1 ? "" : "s"}`}
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
