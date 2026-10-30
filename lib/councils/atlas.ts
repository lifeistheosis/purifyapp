/**
 * The atlas's arithmetic (1.8, the owner's pick C of r3-10, "the atlas"; the
 * sheet is Homebase/boards/purify-master/variants/r3-10-history-map.png, its
 * motion r3-10-history-map.mp4 and r3-10-history-map-phones.js). Where the
 * view settles for each step and how it travels there, lifting away between
 * places far apart; where each name goes so that none collide or are cut;
 * the threads' curves; the wheel's spin; the year's turning digits.
 *
 * Pure, so the sums are tested (vitest runs lib/** only). The screen is
 * components/councils/MapAtlas.tsx and the drawing atlasEngine.ts beside it.
 * The numbers are the design's, drawn for a 390 by 844 phone, scaled here to
 * the screen at hand.
 */

import type { Side } from "./map";

export type Pt = { x: number; y: number };
/** The view: the map's point (cx, cy) at the middle of the safe area, z screen px to a map unit. */
export type Cam = { cx: number; cy: number; z: number };
/** A box on the screen: x, y, width, height, in CSS px. */
export type Box = [number, number, number, number];

export type Geo = {
  /** The screen. */
  w: number;
  h: number;
  /** Where a framed place, and what led to it, may sit: under the year, over the wheel. */
  safe: { x0: number; y0: number; x1: number; y1: number };
  /** The band of the screen the map shows between the year and the wheel. */
  vis: { y0: number; y1: number };
  /** The map's own size, in its units. */
  mapW: number;
  mapH: number;
};

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const c01 = (v: number) => clamp(v, 0, 1);
export const lerp = (a: number, b: number, e: number) => a + (b - a) * e;
/** Hermite smoothstep, for a fade. */
export const smooth = (v: number) => {
  const x = c01(v);
  return x * x * (3 - 2 * x);
};

/** A CSS cubic-bezier as a function of progress, solved by Newton's method. */
export function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number): (x: number) => number {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 12; i++) {
      const err = sx(t) - x;
      const d = dx(t);
      if (Math.abs(err) < 1e-7 || Math.abs(d) < 1e-7) break;
      t -= err / d;
    }
    return sy(clamp(t, 0, 1));
  };
}

/** The house curve, app/globals.css --ease-house. */
export const HOUSE = cubicBezier(0.22, 1, 0.36, 1);
/** A flick of the wheel: fast, then a long slow-down. */
export const FLING = cubicBezier(0.1, 0.6, 0.2, 1);

/** The design's timings, in ms. */
export const T = {
  /** The view travelling to a step's place, and to where a spin of the wheel stopped. */
  cam: 1350,
  camLand: 1300,
  /** The view widening while the wheel is spun by hand. */
  camWide: 760,
  /** The share of the view's travel after which the ring opens and the place lights. */
  arrive: 0.42,
  /** The share after which the threads start to draw, and how long they take. */
  threadStart: 0.12,
  threadDraw: 780,
  ring: 1150,
  /** The wheel gliding a row or a few, and the year's digits turning. */
  glide: 460,
  year: 560,
  /** Play: about one event a second, the whole history in under a minute. */
  play: 1050,
} as const;

/** How deep the view lifts between places far apart (a share of its zoom), as drawn. */
export const LIFT = 0.34;

/* ---------------------------------------------------------------- the view */

export type Zooms = { zMin: number; zClose: number; zFloor: number; zCeil: number };

/**
 * How close the view comes. The design's framing (a place alone at 1.5 px a
 * unit, never wider than 0.7 when framing a thread) is for its 362 by 354
 * safe area; a screen's own area scales it, and a pinch may go from the whole
 * map to three times close.
 */
export function zoomsFor(geo: Geo): Zooms {
  const sw = geo.safe.x1 - geo.safe.x0;
  const sh = geo.safe.y1 - geo.safe.y0;
  const k = clamp(Math.min(sw / 362, sh / 354), 0.7, 3);
  const zClose = 1.5 * k;
  const zMin = 0.7 * k;
  const whole = Math.min(geo.w / geo.mapW, Math.max(1, geo.vis.y1 - geo.vis.y0) / geo.mapH) * 0.92;
  return { zMin, zClose, zFloor: Math.min(whole, zMin), zCeil: zClose * 3 };
}

export function safeMid(geo: Geo): Pt {
  return { x: (geo.safe.x0 + geo.safe.x1) / 2, y: (geo.safe.y0 + geo.safe.y1) / 2 };
}

export function toScreen(geo: Geo, c: Cam, p: Pt): Pt {
  const s = safeMid(geo);
  return { x: (p.x - c.cx) * c.z + s.x, y: (p.y - c.cy) * c.z + s.y };
}

export function toMap(geo: Geo, c: Cam, q: Pt): Pt {
  const s = safeMid(geo);
  return { x: (q.x - s.x) / c.z + c.cx, y: (q.y - s.y) / c.z + c.cy };
}

/**
 * Keep the view on the map: its edges may pass the map's only by a margin
 * the land fades into; above, more room, so the north (Moscow) can come down
 * into the clear under the year. A view wider than the map keeps all of it.
 */
export function clampCam(geo: Geo, c: Cam): Cam {
  const s = safeMid(geo);
  const k = clamp(Math.min((geo.safe.x1 - geo.safe.x0) / 362, (geo.safe.y1 - geo.safe.y0) / 354), 0.7, 3);
  const m = (27 * k) / c.z;
  const top = (195 * k) / c.z;
  const fit = (v: number, lo: number, hi: number) => (lo <= hi ? clamp(v, lo, hi) : clamp(v, hi, lo));
  return {
    cx: fit(c.cx, s.x / c.z - m, geo.mapW + m - (geo.w - s.x) / c.z),
    cy: fit(c.cy, (s.y - geo.vis.y0) / c.z - top, geo.mapH + m - (geo.vis.y1 - s.y) / c.z),
    z: c.z,
  };
}

/** The view that holds every point given, with a little room. */
export function overview(geo: Geo, zooms: Zooms, pts: Pt[]): Cam {
  if (!pts.length) return clampCam(geo, { cx: geo.mapW / 2, cy: geo.mapH / 2, z: zooms.zFloor });
  const sw = geo.safe.x1 - geo.safe.x0;
  const sh = geo.safe.y1 - geo.safe.y0;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const z = Math.min(zooms.zClose, (sw - 40) / Math.max(1, x1 - x0), (sh - 40) / Math.max(1, y1 - y0));
  return clampCam(geo, { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, z: Math.max(zooms.zFloor, z) });
}

/**
 * Where the view settles for a step: its place, and where its threads begin,
 * framed (the place kept well inside the view), then slid within the room
 * that leaves to show as many of the places already lit as it can: at 988
 * the cities of the south, not the empty north above Kyiv.
 */
export function frameFor(geo: Geo, zooms: Zooms, place: Pt, from: Pt[], lit: Pt[], pad = 40): Cam {
  const sw = geo.safe.x1 - geo.safe.x0;
  const sh = geo.safe.y1 - geo.safe.y0;
  let cx = place.x;
  let cy = place.y;
  let z = zooms.zClose;
  const pts = [place, ...from];
  if (from.length) {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    z = Math.min((sw - 2 * pad) / Math.max(1, x1 - x0), (sh - 2 * pad) / Math.max(1, y1 - y0));
    z = clamp(z, zooms.zMin, zooms.zClose);
    cx = (x0 + x1) / 2;
    cy = (y0 + y1) / 2;
    const hx = Math.max(0, sw / 2 - 46) / z;
    const hy = Math.max(0, sh / 2 - 46) / z;
    cx = clamp(cx, place.x - hx, place.x + hx);
    cy = clamp(cy, place.y - hy, place.y + hy);
  }
  return bestView(geo, pts, lit, clampCam(geo, { cx, cy, z }));
}

function bestView(geo: Geo, pts: Pt[], lit: Pt[], c0: Cam): Cam {
  const s = safeMid(geo);
  const z = c0.z;
  const mg = 46;
  let xl = -1e9;
  let xh = 1e9;
  let yl = -1e9;
  let yh = 1e9;
  for (const p of pts) {
    xl = Math.max(xl, p.x - (geo.safe.x1 - mg - s.x) / z);
    xh = Math.min(xh, p.x - (geo.safe.x0 + mg - s.x) / z);
    yl = Math.max(yl, p.y - (geo.safe.y1 - mg - s.y) / z);
    yh = Math.min(yh, p.y - (geo.safe.y0 + mg - s.y) / z);
  }
  // An axis with no room to spare stays where the framing put it.
  if (xl > xh) xl = xh = c0.cx;
  if (yl > yh) yl = yh = c0.cy;
  let best = c0;
  let bestScore = -1e9;
  for (let a = 0; a <= 10; a++) {
    for (let b = 0; b <= 10; b++) {
      const c = clampCam(geo, { cx: lerp(xl, xh, a / 10), cy: lerp(yl, yh, b / 10), z });
      const q = toScreen(geo, c, pts[0]);
      if (q.x < geo.safe.x0 + 20 || q.x > geo.safe.x1 - 20 || q.y < geo.safe.y0 + 20 || q.y > geo.safe.y1 - 20) continue;
      let n = 0;
      for (const p of lit) {
        const r = toScreen(geo, c, p);
        if (r.x > 24 && r.x < geo.w - 24 && r.y > geo.vis.y0 + 24 && r.y < geo.vis.y1 - 24) n++;
      }
      const score = n - Math.hypot(c.cx - c0.cx, c.cy - c0.cy) * z * 0.004;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
  }
  return best;
}

/**
 * The view partway between two, at progress e: its centre straight across,
 * its zoom on a log scale (so it feels even), lifted away in the middle by
 * `dip` and come down again.
 */
export function camBetween(a: Cam, b: Cam, e: number, dip: number): Cam {
  const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), e)) * (1 - dip * Math.sin(Math.PI * e));
  return { cx: lerp(a.cx, b.cx, e), cy: lerp(a.cy, b.cy, e), z };
}

/** How far the view lifts between two: nothing between neighbours, the whole of LIFT from 300 units apart. */
export function liftBetween(a: Cam, b: Cam): number {
  return LIFT * Math.min(1, Math.hypot(b.cx - a.cx, b.cy - a.cy) / 300);
}

/* ---------------------------------------------------------------- the threads */

export type Curve = { a: Pt; c: Pt; b: Pt };

/** A thread from what led here to here: a curve bowing to the north of the line between them. */
export function threadCurve(a: Pt, b: Pt): Curve {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const k = Math.min(0.2 * len, 80);
  return { a, b, c: { x: (a.x + b.x) / 2 + nx * k, y: (a.y + b.y) / 2 + ny * k } };
}

export function curveAt(q: Curve, u: number): Pt {
  const v = 1 - u;
  return { x: v * v * q.a.x + 2 * v * u * q.c.x + u * u * q.b.x, y: v * v * q.a.y + 2 * v * u * q.c.y + u * u * q.b.y };
}

export function curveLength(q: Curve): number {
  let len = 0;
  let p = q.a;
  for (let i = 1; i <= 24; i++) {
    const n = curveAt(q, i / 24);
    len += Math.hypot(n.x - p.x, n.y - p.y);
    p = n;
  }
  return len;
}

/* ---------------------------------------------------------------- the names */

/** The name a mark carries, on its two lines where it names two places ("Constantinople", "and Chalcedon"). */
export function nameLines(name: string): [string] | [string, string] {
  const i = name.indexOf(" and ");
  return i > 0 ? [name.slice(0, i), name.slice(i + 1)] : [name];
}

export type Spot = "right" | "left" | "up" | "down" | "ur" | "dr" | "ul" | "dl";

export type LabelAsk = {
  id: string;
  /** The mark, on the screen. */
  x: number;
  y: number;
  /** The widest of its lines, measured. */
  w: number;
  lines: number;
  /** The step's own place: larger, and placed first. */
  cur: boolean;
  side: Side;
};

/** The label's type: the step's place 14 px, the others 12.5, a second line 10.5 under. */
export const LABEL = { cur: 14, other: 12.5, second: 10.5, secondGap: 13 } as const;

export function labelHeight(cur: boolean, lines: number): number {
  return (cur ? LABEL.cur : LABEL.other) * 1.2 + (lines > 1 ? LABEL.secondGap : 0);
}

const hit = (a: Box, b: Box) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];

/**
 * Place the names in order of what matters (the caller's), each at the first
 * spot around its mark that is on the screen, clear of the screen's own
 * pieces (the year, the wheel), of every name placed before it and of every
 * other mark. A name with no such spot is left out rather than cut or laid
 * over another. `mem` keeps each name where it last stood, so names do not
 * hop from side to side as the view moves.
 */
export function placeLabels(
  asks: LabelAsk[],
  ctx: { w: number; h: number; obstacles: Box[]; dots: { id: string; x: number; y: number; r: number }[]; mem: Map<string, Spot> },
): Map<string, { spot: Spot; box: Box }> {
  const placed: Box[] = [];
  const out = new Map<string, { spot: Spot; box: Box }>();
  const inset = 6;
  for (const a of asks) {
    const l1 = (a.cur ? LABEL.cur : LABEL.other) * 1.2;
    const hh = labelHeight(a.cur, a.lines);
    const gap = a.cur ? 16 : 8.5;
    const dg = gap * 0.72;
    const { x, y, w } = a;
    const spots: Record<Spot, [number, number]> = {
      right: [x + gap, y - l1 / 2],
      left: [x - gap - w, y - l1 / 2],
      up: [x - w / 2, y - gap - hh],
      down: [x - w / 2, y + gap],
      ur: [x + dg, y - dg - hh],
      dr: [x + dg, y + dg],
      ul: [x - dg - w, y - dg - hh],
      dl: [x - dg - w, y + dg],
    };
    const order = [...new Set([ctx.mem.get(a.id), a.side, "right", "left", "up", "down", "ur", "dr", "ul", "dl"])].filter(
      (k): k is Spot => typeof k === "string",
    );
    for (const k of order) {
      const [bx, by] = spots[k];
      const box: Box = [bx, by, w, hh];
      if (bx < inset || by < inset || bx + w > ctx.w - inset || by + hh > ctx.h - inset) continue;
      const pad: Box = [bx - 3, by - 2, w + 6, hh + 4];
      if (placed.some((p) => hit(pad, p))) continue;
      if (ctx.obstacles.some((o) => hit(box, o))) continue;
      if (ctx.dots.some((d) => d.id !== a.id && hit(box, [d.x - d.r, d.y - d.r, 2 * d.r, 2 * d.r]))) continue;
      ctx.mem.set(a.id, k);
      placed.push(box);
      out.set(a.id, { spot: k, box });
      break;
    }
  }
  return out;
}

/* ---------------------------------------------------------------- the steps */

/** The runs of one age each, as the steps fall in time: [first, last] by index. */
export function eraRuns<E>(eras: E[]): { era: E; a: number; b: number }[] {
  const runs: { era: E; a: number; b: number }[] = [];
  eras.forEach((era, i) => {
    const last = runs[runs.length - 1];
    if (last && last.era === era) last.b = i;
    else runs.push({ era, a: i, b: i });
  });
  return runs;
}

/**
 * The step a tap on a mark goes to: the latest thing there up to the step on
 * screen, or, where nothing there has happened yet, the first.
 */
export function stepAtMark(marks: (string | null)[], mark: string, now: number): number {
  let first = -1;
  let latest = -1;
  marks.forEach((m, i) => {
    if (m !== mark) return;
    if (first < 0) first = i;
    if (i <= now) latest = i;
  });
  return latest >= 0 ? latest : first;
}

/** The door's still, as drawn: 362 by 236 on a phone. */
export const DOOR_ASPECT = 362 / 236;

/**
 * The catalog's key for an age's name, the same key History's own screens
 * use (lib/history/labels.ts, eraKey; a test holds the two together), written
 * here so the atlas's script does not carry History's whole registry.
 */
export function eraNameKey(era: string, part: "label" | "short"): string {
  return `study.history.era.${era}.${part}`;
}

/**
 * The view of the page's still: every place, with room, at the card's own
 * proportions, inside the map where it can be.
 */
export function stillView(pts: Pt[], map: [number, number], aspect: number, margin = 44): [number, number, number, number] {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  let x0 = Math.min(...xs) - margin;
  let x1 = Math.max(...xs) + margin;
  let y0 = Math.min(...ys) - margin;
  let y1 = Math.max(...ys) + margin;
  const w = x1 - x0;
  const h = y1 - y0;
  if (w / h < aspect) {
    const grow = (h * aspect - w) / 2;
    x0 -= grow;
    x1 += grow;
  } else {
    const grow = (w / aspect - h) / 2;
    y0 -= grow;
    y1 += grow;
  }
  const slide = (lo: number, hi: number, max: number): [number, number] => {
    if (hi - lo >= max) return [(max - (hi - lo)) / 2, (max - (hi - lo)) / 2 + (hi - lo)];
    if (lo < 0) return [0, hi - lo];
    if (hi > max) return [max - (hi - lo), max];
    return [lo, hi];
  };
  [x0, x1] = slide(x0, x1, map[0]);
  [y0, y1] = slide(y0, y1, map[1]);
  return [x0, y0, x1 - x0, y1 - y0];
}

/* ---------------------------------------------------------------- the wheel */

/** A wheel row's height, as drawn. */
export const ROW = 50;

/** Past either end the wheel gives a little, and no more. */
export function rubber(pos: number, n: number): number {
  const max = Math.max(0, n - 1);
  if (pos < 0) return -Math.min(0.9, -pos * 0.35);
  if (pos > max) return max + Math.min(0.9, (pos - max) * 0.35);
  return pos;
}

/**
 * Where a flick comes to rest, a whole row, and how long the spin takes: the
 * row it would coast to, at a pace that starts as fast as the finger left it
 * (the fling curve starts six times its average speed).
 */
export function flingTo(pos: number, rowsPerMs: number, n: number): { to: number; ms: number } {
  const to = clamp(Math.round(pos + rowsPerMs * 300), 0, Math.max(0, n - 1));
  const dist = Math.abs(to - pos);
  const speed = Math.abs(rowsPerMs);
  const ms = speed > 1e-4 && dist > 0.05 ? clamp((6 * dist) / speed, 260, 1500) : clamp(200 + 160 * dist, 160, 420);
  return { to, ms };
}

/* ---------------------------------------------------------------- the year */

/** The year's digits, thousands first; -1 where it has none (325 has no thousands). */
export function digitsOf(year: number): number[] {
  return [3, 2, 1, 0].map((k) => (k === 0 || year >= 10 ** k ? Math.floor(year / 10 ** k) % 10 : -1));
}

/**
 * How many places each digit's wheel turns from one year to the next: forward
 * in time it rolls up (9 to 0 is one place on), back in time it rolls down.
 * A digit that comes or goes turns from or to nothing (0 places).
 */
export function digitTurns(from: number, to: number): number[] {
  const a = digitsOf(from);
  const b = digitsOf(to);
  return a.map((d, i) => {
    const e = b[i];
    if (d < 0 || e < 0 || d === e) return 0;
    return to > from ? (e - d + 10) % 10 : -((d - e + 10) % 10);
  });
}
