/**
 * The sparkline's geometry, with no DOM in it.
 *
 * components/admin/ledger/Sparkline.tsx and TrendChart.tsx both draw a
 * series as one polyline and animate it in by stroke-dashoffset. Both
 * need the same two numbers: the path string, and the path's LENGTH, which
 * is what the dash offset counts down from. Measuring the length with
 * getTotalLength() after mount means a first frame drawn before the
 * measurement lands, which shows as a stutter; a polyline's length is the
 * sum of its segments and can be computed before anything renders. That is
 * why this is straight segments and not a smoothed curve: a curve's length
 * is an estimate, and an estimate is a stutter.
 *
 * Tested in lib/admin/__tests__/sparklinePath.test.ts.
 */

export type Point = { x: number; y: number };

export type Frame = {
  width: number;
  height: number;
  /** Inset so a 1.25px stroke at the top or bottom is not clipped. */
  pad?: number;
};

/**
 * Map a series onto a box. The y-range is the series' own min and max,
 * unless a shared domain is passed, which TrendChart does so the compare
 * line sits on the same scale as the main one. A flat series draws as a
 * line through the vertical middle, which is what a flat series looks like.
 */
export function project(
  data: number[],
  frame: Frame,
  domain?: { min: number; max: number },
): Point[] {
  const n = data.length;
  if (n === 0) return [];
  const pad = frame.pad ?? 1;
  const min = domain?.min ?? Math.min(...data);
  const max = domain?.max ?? Math.max(...data);
  const span = max - min;
  const innerH = Math.max(0, frame.height - pad * 2);
  const stepX = n > 1 ? frame.width / (n - 1) : 0;
  return data.map((v, i) => ({
    x: n > 1 ? i * stepX : frame.width / 2,
    y: span === 0 ? pad + innerH / 2 : pad + innerH - ((v - min) / span) * innerH,
  }));
}

/** M x y L x y ... with two decimals, so the attribute is short and stable. */
export function polyline(points: Point[]): string {
  if (points.length === 0) return "";
  const f = (n: number) => (Math.round(n * 100) / 100).toString();
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${f(p.x)} ${f(p.y)}`)
    .join(" ");
}

/** Sum of segment lengths. Exact for a polyline, which is the point. */
export function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

/** The domain two series share, so a compare line is drawn to the same scale. */
export function sharedDomain(...series: (number[] | undefined)[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series) {
    if (!s) continue;
    for (const v of s) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (min === Infinity) return { min: 0, max: 0 };
  return { min, max };
}

/**
 * Two or three y ticks: the floor, the ceiling, and the middle when the
 * chart is tall enough to fit a third label without the three touching.
 * Rounded to a clean step so the labels read as numbers a person would say.
 */
export function yTicks(domain: { min: number; max: number }, height: number): number[] {
  if (domain.max === domain.min) return [domain.min];
  const three = height >= 180;
  if (!three) return [domain.min, domain.max];
  return [domain.min, (domain.min + domain.max) / 2, domain.max];
}

/** Index of the point nearest an x offset in the same units as `width`. */
export function nearestIndex(x: number, width: number, count: number): number {
  if (count <= 1) return 0;
  const step = width / (count - 1);
  const i = Math.round(x / Math.max(step, 0.0001));
  return Math.max(0, Math.min(count - 1, i));
}
