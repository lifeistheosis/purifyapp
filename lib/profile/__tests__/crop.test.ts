import { describe, expect, it } from "vitest";

import { CROP_SHAPES, MAX_ZOOM, clampView, cropRect, panView, scaleOf, zoomView } from "../crop";

// A landscape phone photo in a 300px square frame: at zoom 1 it is scaled so
// its height fills the frame (300 / 3000 = 0.1) and its sides overhang.
const IMG = { w: 4000, h: 3000 };
const BOX = { w: 300, h: 300 };
const START = { zoom: 1, cx: 2000, cy: 1500 };

describe("placing a picture in the frame", () => {
  it("starts covering the frame, centred", () => {
    expect(scaleOf(1, IMG, BOX)).toBeCloseTo(0.1);
    expect(cropRect(START, IMG, BOX)).toEqual({ sx: 500, sy: 0, sw: 3000, sh: 3000 });
  });

  it("drags, and never past an edge", () => {
    // 50 screen px to the right shows 500 picture px further left.
    expect(panView(START, 50, 0, IMG, BOX).cx).toBeCloseTo(1500);
    // Far past the edge stops with the picture's edge on the frame's.
    const left = panView(START, 10_000, 0, IMG, BOX);
    expect(cropRect(left, IMG, BOX).sx).toBeCloseTo(0);
    const right = panView(START, -10_000, 0, IMG, BOX);
    const r = cropRect(right, IMG, BOX);
    expect(r.sx + r.sw).toBeCloseTo(IMG.w);
    // At zoom 1 the height already fills the frame: up and down go nowhere.
    expect(panView(START, 0, 80, IMG, BOX).cy).toBeCloseTo(1500);
  });

  it("zooms about the point under the finger, within 1 and the maximum", () => {
    // The picture point under (75, 75) stays under it.
    const before = { x: START.cx + (75 - 150) / scaleOf(1, IMG, BOX), y: START.cy + (75 - 150) / scaleOf(1, IMG, BOX) };
    const z = zoomView(START, 2, IMG, BOX, 75, 75);
    const s2 = scaleOf(2, IMG, BOX);
    expect(z.cx + (75 - 150) / s2).toBeCloseTo(before.x);
    expect(z.cy + (75 - 150) / s2).toBeCloseTo(before.y);
    expect(zoomView(START, 99, IMG, BOX).zoom).toBe(MAX_ZOOM);
    expect(zoomView(START, 0.2, IMG, BOX).zoom).toBe(1);
    expect(zoomView(START, Number.NaN, IMG, BOX).zoom).toBe(1);
  });

  it("zooming out from a corner pulls the picture back over the frame", () => {
    const corner = clampView({ zoom: 4, cx: 0, cy: 0 }, IMG, BOX);
    const out = zoomView(corner, 1, IMG, BOX);
    const r = cropRect(out, IMG, BOX);
    expect(r.sx).toBeGreaterThanOrEqual(-1e-9);
    expect(r.sy).toBeGreaterThanOrEqual(-1e-9);
    expect(r.sx + r.sw).toBeLessThanOrEqual(IMG.w + 1e-9);
    expect(r.sy + r.sh).toBeLessThanOrEqual(IMG.h + 1e-9);
  });

  it("a banner frame keeps its 3 to 1 shape, and both outputs are what the routes take", () => {
    const box = { w: 600, h: 200 };
    const r = cropRect(clampView({ zoom: 1, cx: 2000, cy: 1500 }, IMG, box), IMG, box);
    expect(r.sw / r.sh).toBeCloseTo(3);
    expect(CROP_SHAPES.avatar.out).toEqual([512, 512]);
    expect(CROP_SHAPES.banner.out[0] / CROP_SHAPES.banner.out[1]).toBe(CROP_SHAPES.banner.aspect);
  });
});
