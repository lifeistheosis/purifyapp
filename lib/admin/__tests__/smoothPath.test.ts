import { describe, expect, it } from "vitest";

import { smoothPath } from "@/components/admin/charts";

/**
 * Every cubic segment's control points must sit inside the y-range of the
 * segment's two endpoints. That is the property that keeps a flat baseline
 * flat and a spike from ringing: a bezier cannot leave the convex hull of
 * its control points, so if the controls stay in range, so does the curve.
 */
function segments(d: string) {
  const m = d.match(/^M (\S+) (\S+)/);
  if (!m) throw new Error("no moveto");
  let prev = { x: Number(m[1]), y: Number(m[2]) };
  const out: { p1: typeof prev; c1: typeof prev; c2: typeof prev; p2: typeof prev }[] = [];
  const re = /C (\S+) (\S+), (\S+) (\S+), (\S+) (\S+)/g;
  for (const c of d.matchAll(re)) {
    const seg = {
      p1: prev,
      c1: { x: Number(c[1]), y: Number(c[2]) },
      c2: { x: Number(c[3]), y: Number(c[4]) },
      p2: { x: Number(c[5]), y: Number(c[6]) },
    };
    out.push(seg);
    prev = seg.p2;
  }
  return out;
}

const pts = (ys: number[]) => ys.map((y, i) => ({ x: i * 10, y }));

describe("smoothPath", () => {
  it("never leaves the range of the two points it joins", () => {
    // The 2026-09-06 shape: a flat zero baseline with lone spikes. y grows
    // downward in SVG, so 100 is the axis and 5 is a tall spike.
    const d = smoothPath(pts([100, 100, 100, 100, 5, 100, 5, 100, 100, 5]));
    for (const s of segments(d)) {
      const lo = Math.min(s.p1.y, s.p2.y);
      const hi = Math.max(s.p1.y, s.p2.y);
      expect(s.c1.y).toBeGreaterThanOrEqual(lo - 1e-9);
      expect(s.c1.y).toBeLessThanOrEqual(hi + 1e-9);
      expect(s.c2.y).toBeGreaterThanOrEqual(lo - 1e-9);
      expect(s.c2.y).toBeLessThanOrEqual(hi + 1e-9);
    }
  });

  it("keeps a flat run exactly flat", () => {
    const d = smoothPath(pts([100, 100, 100, 100]));
    for (const s of segments(d)) {
      expect(s.c1.y).toBe(100);
      expect(s.c2.y).toBe(100);
    }
  });

  it("still passes through every point, in order", () => {
    const ys = [40, 10, 60, 20, 90];
    const d = smoothPath(pts(ys));
    const ends = segments(d).map((s) => s.p2.y);
    expect(ends).toEqual(ys.slice(1));
  });

  it("degrades to a moveto for one point and nothing for none", () => {
    expect(smoothPath([{ x: 3, y: 4 }])).toBe("M 3 4");
    expect(smoothPath([])).toBe("");
  });
});
