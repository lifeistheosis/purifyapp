"use client";

import { useReducedMotion } from "@/lib/ui/motion";
import { pathLength, polyline, project } from "@/lib/admin/ledger/sparkline";

/**
 * A series as one ink line. Nothing else: no fill, no gradient, no dot.
 *
 * Drawn once, left to right, over --adm-draw-ms. The mechanism is the
 * stroke-dashoffset trick in admin-theme.css (.adm-draw): the dash length
 * is the path's own length, set as --adm-len, and the offset animates from
 * that down to zero. The length comes from lib/admin/ledger/sparkline.ts,
 * computed from the points before render, so there is no measured-after-
 * mount stutter and no first frame with the line already there.
 *
 * Reduced motion renders the final state: .adm-draw-static clears the dash.
 *
 * Width is a number of pixels, and the SVG is exactly that wide. A tile
 * hands in its own measured width; the 36px default height is the tile's.
 */
export function Sparkline({
  data,
  width,
  height = 36,
  color = "var(--adm-ink)",
  dashed = false,
  className,
}: {
  data: number[];
  width: number;
  height?: number;
  /** A token, never a hex. The compare line passes --adm-ink-2. */
  color?: string;
  /** The compare series: muted, 1px, dashed. */
  dashed?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (width <= 0 || data.length < 2) {
    return <svg width={Math.max(0, width)} height={height} aria-hidden className={className} />;
  }
  const pts = project(data, { width, height, pad: 1.5 });
  const d = polyline(pts);
  const len = pathLength(pts);
  // A dashed compare line cannot also carry the draw dash, so it fades in
  // instead: it is the secondary line and nobody watches it arrive.
  const drawClass = reduced || dashed ? "adm-draw-static" : "adm-draw";
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className={["block overflow-visible", className].filter(Boolean).join(" ")}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeDasharray={dashed ? "3 3" : undefined}
        strokeLinecap="butt"
        strokeLinejoin="round"
        className={drawClass}
        // strokeWidth as a style, not an attribute: a presentation attribute
        // cannot read a custom property, a style can.
        style={{
          strokeWidth: dashed ? 1 : "var(--adm-chart-line)",
          ["--adm-len" as string]: `${Math.ceil(len)}`,
        }}
      />
    </svg>
  );
}
