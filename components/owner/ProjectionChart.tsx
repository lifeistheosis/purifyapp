"use client";

// The projection, as a curve rather than a row of totals.
//
// A number tells you where the model lands. A curve tells you the shape of
// getting there, which is the part an owner actually reasons about: how far
// today is from the line, how steep the next twelve months have to be, and
// how much of the distance is assumption rather than history.
//
// TWO SERIES, AND THE DIFFERENCE BETWEEN THEM IS THE POINT. The solid line is
// where the business is. The dashed one is where the assumptions say it goes.
// They are drawn in one path each, sharing a scale, so the gap is legible at a
// glance instead of requiring two numbers to be held in the head at once.
//
// MOTION. On first paint the line draws itself, once, in 900ms. After that a
// change to an assumption INTERPOLATES: the curve moves to its new shape over
// 380ms rather than snapping. That is not decoration. Dragging a slider and
// watching the line bend is how a person feels the sensitivity of an input,
// and a jump-cut between two states hides exactly that. prefers-reduced-motion
// turns both off and the chart renders at its final position.
//
// No chart library. components/admin/charts.tsx is 900 lines of hand-rolled
// SVG for the same reason: an admin panel that pulls in a charting dependency
// pays for it on every page, and none of these shapes are hard.

import { useEffect, useMemo, useRef, useState } from "react";

// The curve maths moved to charts.tsx in v4 so the hero metric cards
// could use it too. Same function, one copy.
import { smoothPath } from "@/components/admin/charts";

export type Series = {
  label: string;
  points: number[];
  color: string;
  dashed?: boolean;
};

const W = 720;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

/**
 * Interpolate between the previous series and the next, so a slider bends the
 * line instead of teleporting it. Runs on rAF and stops itself.
 */
function useTween(target: number[][], ms: number, enabled: boolean): number[][] {
  // Null means "not mid-animation", and the target is rendered directly. That
  // is what keeps the disabled and shape-changed paths from calling setState
  // synchronously inside the effect, which React flags as a cascading render
  // and which AdminThemeToggle already learned the hard way.
  const [frame, setFrame] = useState<number[][] | null>(null);
  const from = useRef(target);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const a = from.current;
    const b = target;
    // A shape change (a different number of points) has no meaningful
    // in-between, so it is taken directly rather than tweened into nonsense.
    const sameShape =
      a.length === b.length && a.every((s, i) => s.length === b[i].length);

    if (!enabled || !sameShape) {
      from.current = b;
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // easeOutCubic: fast to nearly there, then settles. Matches --adm-ease.
      const e = 1 - Math.pow(1 - t, 3);
      const next = a.map((s, i) => s.map((v, j) => v + (b[i][j] - v) * e));
      // Inside rAF, so asynchronous and outside the effect body.
      setFrame(t < 1 ? next : null);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      // Resume from wherever the interrupted tween had reached, so a fast
      // slider drag stays continuous instead of snapping back each time.
      from.current = frame ?? b;
    };
    // `frame` is read only in cleanup and must not restart the tween.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms, enabled]);

  return frame ?? target;
}

export function ProjectionChart({
  series,
  xLabel,
  yFormat,
  caption,
}: {
  series: Series[];
  xLabel: (i: number, n: number) => string;
  yFormat: (v: number) => string;
  caption?: string;
}) {
  const [reduced, setReduced] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduced(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  const raw = useMemo(() => series.map((s) => s.points), [series]);
  const tweened = useTween(raw, 380, !reduced);

  const n = Math.max(...tweened.map((s) => s.length), 0);
  const max = niceCeil(Math.max(1, ...tweened.flat()));

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  const paths = tweened.map((pts) =>
    smoothPath(pts.map((v, i) => ({ x: x(i), y: y(v) }))),
  );
  const areaPath =
    paths[0] && tweened[0]?.length
      ? `${paths[0]} L ${x(tweened[0].length - 1)} ${PAD.top + plotH} L ${x(0)} ${PAD.top + plotH} Z`
      : "";

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const gid = "own-grad";

  return (
    <figure className="m-0">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: 480, height: "auto" }}
          role="img"
          aria-label={
            caption ??
            series.map((s) => `${s.label}, ending ${yFormat(s.points.at(-1) ?? 0)}`).join(". ")
          }
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            const i = Math.round(((px - PAD.left) / plotW) * (n - 1));
            setHover(i >= 0 && i < n ? i : null);
          }}
        >
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={series[0]?.color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={series[0]?.color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--chart-grid)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y(t) + 4}
                textAnchor="end"
                fontSize="10.5"
                fill="var(--chart-axis)"
                fontFamily="ui-sans-serif, system-ui"
              >
                {yFormat(t)}
              </text>
            </g>
          ))}

          {areaPath && (
            <path d={areaPath} fill={`url(#${gid})`} className={reduced ? "" : "own-fill"} />
          )}

          {paths.map((d, i) => (
            <path
              key={series[i]?.label ?? i}
              // Measure the real length and hand it to the keyframe. A guessed
              // dash length either clips the line or leaves it visible before
              // the animation starts, and both read as a stutter.
              ref={(el) => {
                if (!el || reduced || series[i]?.dashed) return;
                el.style.setProperty("--own-len", String(el.getTotalLength()));
              }}
              d={d}
              fill="none"
              stroke={series[i]?.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={series[i]?.dashed ? "5 5" : undefined}
              className={reduced || series[i]?.dashed ? "" : "own-draw"}
            />
          ))}

          {hover !== null && (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="var(--adm-line-strong)"
                strokeWidth="1"
              />
              {tweened.map((s, si) =>
                s[hover] === undefined ? null : (
                  <circle
                    key={si}
                    cx={x(hover)}
                    cy={y(s[hover])}
                    r="3.5"
                    fill="var(--adm-panel)"
                    stroke={series[si]?.color}
                    strokeWidth="2"
                  />
                ),
              )}
            </g>
          )}

          <text
            x={PAD.left}
            y={H - 8}
            fontSize="10.5"
            fill="var(--chart-axis)"
            fontFamily="ui-sans-serif, system-ui"
          >
            {xLabel(0, n)}
          </text>
          <text
            x={W - PAD.right}
            y={H - 8}
            textAnchor="end"
            fontSize="10.5"
            fill="var(--chart-axis)"
            fontFamily="ui-sans-serif, system-ui"
          >
            {xLabel(n - 1, n)}
          </text>
        </svg>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-2 font-sans text-[12px]">
            <span
              aria-hidden
              className="inline-block h-0.5 w-4 rounded-[var(--adm-radius-pill)]"
              style={{
                background: s.dashed
                  ? `repeating-linear-gradient(90deg, ${s.color}, ${s.color} 3px, transparent 3px, transparent 6px)`
                  : s.color,
              }}
            />
            <span style={{ color: "var(--adm-ink-2)" }}>{s.label}</span>
            <span className="own-num" style={{ color: "var(--adm-ink)" }}>
              {yFormat(
                hover !== null && s.points[hover] !== undefined
                  ? s.points[hover]
                  : (s.points.at(-1) ?? 0),
              )}
            </span>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
