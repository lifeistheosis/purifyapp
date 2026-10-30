/**
 * Moving the saints on the web (1.8, round 3, sheet r3-06, drag B). The
 * owner's note 30 on build 80: the saints movable "rather than static, but
 * like they stay together". He left the pick to the design job on 2026-10-30
 * ("The Saint web, you could choose"), and the pick is B: a saint stays where
 * he is put (boards/purify-master/variants/r3-06-saint-web-drag.mp4).
 *
 * Each saint hangs on a thread from the one his line runs to: the saint in
 * the middle, or the council a father sat at. He rests at a place, the web's
 * own (webLayout.ts) until a reader moves him. Drag a saint and his thread
 * stretches; the saint at its other end follows a little, and the saints near
 * him make room. Let go and he stays where he was put, his thread taking its
 * new length, and the others settle round him. The saint in the middle is
 * pinned: a thread tugs him while a finger holds a saint, he is never pushed
 * aside, and he is home again once the finger lets go. Put back returns every
 * saint to the web's own places.
 *
 * Springs, stepped 240 times a second. The numbers are the ones the sheet's
 * video was drawn with (variants/r3-06-saint-web-drag.html), in the web's own
 * units: across, a share of the 390 a phone is drawn on; down, pixels.
 *
 * Pure: no DOM and no clock. The screen steps it on animation frames and
 * paints what it holds (components/saints/web/WebConstellation.tsx). With
 * Purify's motion off the screen asks for the settled picture at once
 * (`settle`), so a drag still moves the saint and nothing swings after.
 * Imports nothing but the web's own shapes, so the app's script carries no
 * more than this file.
 */

import { BOX, CENTER_BOX, WEB_WIDTH, type WebLayout } from "./webLayout";

export type Point = { x: number; y: number };

/** A saint's room: half its width and height, and how far its middle sits below his circle's centre. */
export type Room = { hx: number; hy: number; off: number };

/** A saint's circle and the name under it (webLayout.ts, BOX). */
export const NODE_ROOM: Room = { hx: BOX.half, hy: (BOX.up + BOX.down) / 2, off: (BOX.down - BOX.up) / 2 };

/** The saint in the middle: his circle and his name under it, as one box (webLayout.ts, CENTER_BOX). */
export const MIDDLE_ROOM: Room = {
  hx: (CENTER_BOX[1].right - CENTER_BOX[1].left) / 2,
  hy: (CENTER_BOX[1].bottom - CENTER_BOX[0].top) / 2,
  off: (CENTER_BOX[1].bottom + CENTER_BOX[0].top) / 2,
};

/** Spring constants, per unit of mass (1/s²), and damping as a share of critical. */
export const MOTION = {
  /** A saint's spring to his place, and how quickly it calms. */
  place: 70,
  placeDamping: 0.86,
  /** The saint in the middle: stiffer, and calmer. */
  middle: 200,
  middleDamping: 0.95,
  /** A saint put somewhere new holds there a little more firmly, and does not swing. */
  stay: 160,
  stayDamping: 1,
  /** A thread pulls when it is stretched; slack, it never pushes. */
  thread: 70,
  /** Two saints' rooms meeting: the free one moves away. */
  room: 1400,
  /** The canvas's edges, softly. */
  wall: 2000,
  /** The saint under the finger follows it closely. */
  follow: 1400,
} as const;

/** One step: a 240th of a second. */
export const STEP = 1 / 240;

/** How far past the canvas's edges a finger may carry a saint before he stops. */
const FINGER_SLACK = 24;
/** How far past them a saint let go may be pressed by another. */
const WALL_GIVE = 6;

/** Still enough to stop stepping: speed in units a second, pull in units a second squared. */
const STILL_SPEED = 0.5;
const STILL_PULL = 4;

export type WebMotion = {
  /** Body 0 is the saint in the middle; body i + 1 is the web's node i. */
  home: Point[];
  /** The body each thread runs to; -1 for the saint in the middle. */
  parent: number[];
  room: Room[];
  p: Point[];
  v: Point[];
  /** Where each body rests: his home, or where a reader put him. */
  anchor: Point[];
  k: number[];
  zeta: number[];
  /** Each thread's length at rest. */
  rest: number[];
  /** The body a finger holds, or -1. */
  held: number;
  /** The body just let go, until the web is still: his place is then where he came to rest. */
  placed: number;
  /** Put back: each saint flies home over the others, and meets them again only once he is there. */
  flying: boolean[];
  /** Where the finger is. */
  target: Point;
  /** With Purify's motion off the held saint is where the finger is, at once. */
  exact: boolean;
  bounds: { x0: number; x1: number; y0: number; y1: number };
  /** Whether the last step found everything still. */
  still: boolean;
};

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const copy = (p: Point): Point => ({ x: p.x, y: p.y });

/**
 * The web at rest in its own places. `parents[i]` is the node that node i's
 * line runs to (a council, for a father who sat at it), or -1 for the saint in
 * the middle.
 */
export function webMotion(layout: WebLayout, parents: readonly number[]): WebMotion {
  const home = [layout.center, ...layout.places].map(copy);
  const parent = [-1, ...layout.places.map((_, i) => ((parents[i] ?? -1) >= 0 ? parents[i] + 1 : 0))];
  return {
    home,
    parent,
    room: home.map((_, i) => (i === 0 ? MIDDLE_ROOM : NODE_ROOM)),
    p: home.map(copy),
    v: home.map(() => ({ x: 0, y: 0 })),
    anchor: home.map(copy),
    k: home.map((_, i) => (i === 0 ? MOTION.middle : MOTION.place)),
    zeta: home.map((_, i) => (i === 0 ? MOTION.middleDamping : MOTION.placeDamping)),
    rest: home.map((h, i) => (i === 0 ? 0 : dist(h, home[parent[i]]))),
    held: -1,
    placed: -1,
    flying: home.map(() => false),
    target: { x: 0, y: 0 },
    exact: false,
    bounds: {
      x0: BOX.half - 4,
      x1: WEB_WIDTH - BOX.half + 4,
      y0: BOX.up + 2,
      y1: Math.max(BOX.up + 2, layout.height - BOX.down - 4),
    },
    still: true,
  };
}

function clampTo(m: WebMotion, p: Point, slack = 0): Point {
  const { x0, x1, y0, y1 } = m.bounds;
  return {
    x: Math.min(x1 + slack, Math.max(x0 - slack, p.x)),
    y: Math.min(y1 + slack, Math.max(y0 - slack, p.y)),
  };
}

/** Where a thread's far end rests: the middle saint's home, or the council's place. */
function restEnd(m: WebMotion, body: number): Point {
  const j = m.parent[body];
  return j === 0 ? m.home[0] : m.anchor[j];
}

/** A finger takes a saint. The saint in the middle cannot be taken. */
export function grab(m: WebMotion, body: number): void {
  if (body <= 0 || body >= m.p.length) return;
  m.held = body;
  m.placed = -1;
  m.flying[body] = false;
  m.target = copy(m.p[body]);
  m.still = false;
}

/** The finger moves: the held saint follows it, never far past the canvas. */
export function pull(m: WebMotion, to: Point): void {
  if (m.held < 0) return;
  m.target = clampTo(m, to, FINGER_SLACK);
  if (m.exact) {
    m.p[m.held] = copy(m.target);
    m.v[m.held] = { x: 0, y: 0 };
  }
  m.still = false;
}

/** The finger lets go: the saint stays where he is (inside the canvas), his thread at its new length. */
export function letGo(m: WebMotion): void {
  const b = m.held;
  if (b < 0) return;
  m.held = -1;
  m.anchor[b] = clampTo(m, m.p[b]);
  m.k[b] = MOTION.stay;
  m.zeta[b] = MOTION.stayDamping;
  m.rest[b] = dist(m.anchor[b], restEnd(m, b));
  // Dropped on a saint, he is moved off him; where he comes to rest is then his place (step).
  m.placed = b;
  // The fathers hanging from a council that moved keep their own places; their threads take up the slack.
  m.still = false;
}

/** Every saint back to the web's own places. */
export function putBack(m: WebMotion): void {
  m.held = -1;
  m.placed = -1;
  for (let i = 1; i < m.p.length; i++) {
    m.anchor[i] = copy(m.home[i]);
    m.k[i] = MOTION.place;
    m.zeta[i] = MOTION.placeDamping;
    m.rest[i] = dist(m.home[i], m.home[m.parent[i]]);
    // The way home may cross another saint's: he passes over, and they never jam.
    m.flying[i] = dist(m.p[i], m.home[i]) > 0.5;
  }
  m.still = false;
}

/** Whether any saint rests away from the web's own place. */
export function moved(m: WebMotion): boolean {
  for (let i = 1; i < m.anchor.length; i++) if (dist(m.anchor[i], m.home[i]) > 0.5) return true;
  return false;
}

/** The forces of a step, kept between steps: a drag steps 240 times a second, on phones that collect garbage slowly. */
let FX = new Float64Array(16);
let FY = new Float64Array(16);

/** One step of the springs. */
export function step(m: WebMotion, dt: number = STEP): void {
  const n = m.p.length;
  if (n === 0) return;
  if (FX.length < n) {
    FX = new Float64Array(n * 2);
    FY = new Float64Array(n * 2);
  }
  const fx = FX;
  const fy = FY;
  fx.fill(0, 0, n);
  fy.fill(0, 0, n);
  const holding = m.held >= 0;

  // Each body's spring to the place it rests at.
  for (let i = 0; i < n; i++) {
    if (i === m.held) continue;
    const k = m.k[i];
    const c = 2 * m.zeta[i] * Math.sqrt(k);
    fx[i] += k * (m.anchor[i].x - m.p[i].x) - c * m.v[i].x;
    fy[i] += k * (m.anchor[i].y - m.p[i].y) - c * m.v[i].y;
  }

  // The threads pull when stretched and go slack, never push. The saint in
  // the middle answers one only while a finger holds a saint: at rest he is home.
  for (let i = 1; i < n; i++) {
    const j = m.parent[i];
    const dx = m.p[i].x - m.p[j].x;
    const dy = m.p[i].y - m.p[j].y;
    const len = Math.hypot(dx, dy) || 1;
    const stretch = len - m.rest[i];
    if (stretch <= 0) continue;
    const f = MOTION.thread * stretch;
    const ux = dx / len;
    const uy = dy / len;
    fx[i] -= f * ux;
    fy[i] -= f * uy;
    if (j !== 0 || holding) {
      fx[j] += f * ux;
      fy[j] += f * uy;
    }
  }

  // Room: where two saints' rooms meet (a rounded box, so a corner can pass a
  // corner), each moves away from the other along the line between them. The
  // saint in the middle is never pushed: the other one takes it all. A saint
  // flying home after Put back meets no one until he is there.
  for (let i = 0; i < n; i++) {
    if (m.flying[i]) continue;
    for (let j = i + 1; j < n; j++) {
      if (m.flying[j]) continue;
      const a = m.room[i];
      const b = m.room[j];
      const dx = m.p[j].x - m.p[i].x;
      const dy = m.p[j].y + b.off - (m.p[i].y + a.off);
      const hx = a.hx + b.hx;
      const hy = a.hy + b.hy;
      const u = dx / hx;
      const w = dy / hy;
      const r4 = u * u * u * u + w * w * w * w;
      if (r4 >= 1) continue;
      const d = Math.hypot(dx, dy);
      const nx = d < 1e-3 ? 0 : dx / d;
      const ny = d < 1e-3 ? 1 : dy / d;
      const f = MOTION.room * (1 - Math.sqrt(Math.sqrt(r4))) * Math.min(hx, hy);
      if (i !== 0) {
        fx[i] -= f * nx;
        fy[i] -= f * ny;
      }
      fx[j] += f * nx;
      fy[j] += f * ny;
    }
  }

  // The canvas's edges, softly.
  const { x0, x1, y0, y1 } = m.bounds;
  for (let i = 1; i < n; i++) {
    if (i === m.held) continue;
    const p = m.p[i];
    if (p.x < x0) fx[i] += MOTION.wall * (x0 - p.x);
    if (p.x > x1) fx[i] += MOTION.wall * (x1 - p.x);
    if (p.y < y0) fy[i] += MOTION.wall * (y0 - p.y);
    if (p.y > y1) fy[i] += MOTION.wall * (y1 - p.y);
  }

  // The held saint follows the finger closely, or is simply there.
  if (holding) {
    const i = m.held;
    if (m.exact) {
      fx[i] = 0;
      fy[i] = 0;
      m.p[i] = copy(m.target);
      m.v[i] = { x: 0, y: 0 };
    } else {
      const c = 2 * Math.sqrt(MOTION.follow);
      fx[i] = MOTION.follow * (m.target.x - m.p[i].x) - c * m.v[i].x;
      fy[i] = MOTION.follow * (m.target.y - m.p[i].y) - c * m.v[i].y;
    }
  }

  let still = !holding;
  for (let i = 0; i < n; i++) {
    if (holding && m.exact && i === m.held) continue;
    const p = m.p[i];
    const v = m.v[i];
    v.x += fx[i] * dt;
    v.y += fy[i] * dt;
    p.x += v.x * dt;
    p.y += v.y * dt;
    // Past its soft edge by a little at most: a saint pressed there by another stops at it.
    if (i > 0 && i !== m.held) {
      if (p.x < x0 - WALL_GIVE) [p.x, v.x, fx[i]] = [x0 - WALL_GIVE, Math.max(0, v.x), Math.max(0, fx[i])];
      if (p.x > x1 + WALL_GIVE) [p.x, v.x, fx[i]] = [x1 + WALL_GIVE, Math.min(0, v.x), Math.min(0, fx[i])];
      if (p.y < y0 - WALL_GIVE) [p.y, v.y, fy[i]] = [y0 - WALL_GIVE, Math.max(0, v.y), Math.max(0, fy[i])];
      if (p.y > y1 + WALL_GIVE) [p.y, v.y, fy[i]] = [y1 + WALL_GIVE, Math.min(0, v.y), Math.min(0, fy[i])];
    }
    if (m.flying[i] && dist(p, m.home[i]) < 1.5 && Math.hypot(v.x, v.y) < 8) m.flying[i] = false;
    if (still && (Math.hypot(v.x, v.y) > STILL_SPEED || Math.hypot(fx[i], fy[i]) > STILL_PULL)) still = false;
  }
  if (still) {
    for (const v of m.v) v.x = v.y = 0;
    m.flying.fill(false);
  }
  // The saint let go has come to rest: that is his place now, his thread at its length there.
  // Once, so the web settles from it and stays still.
  if (still && m.placed > 0) {
    const b = m.placed;
    m.placed = -1;
    if (dist(m.p[b], m.anchor[b]) > 0.5) {
      m.anchor[b] = clampTo(m, m.p[b]);
      m.rest[b] = dist(m.anchor[b], restEnd(m, b));
      still = false;
    }
  }
  m.still = still;
}

/**
 * Step through `seconds` of time (a frame's worth, at most a thirtieth of a
 * second, so a page come back to does not leap). True while anything moves.
 */
export function advance(m: WebMotion, seconds: number): boolean {
  const steps = Math.max(1, Math.min(8, Math.round(Math.min(seconds, 1 / 30) / STEP)));
  for (let s = 0; s < steps; s++) {
    step(m);
    if (m.still) break;
  }
  return !m.still;
}

/**
 * The picture once everything has settled, at once: what the screen paints
 * with Purify's motion off. A held saint stays under the finger meanwhile.
 */
export function settle(m: WebMotion, maxSeconds = 6): void {
  const exact = m.exact;
  m.exact = true;
  const steps = Math.ceil(maxSeconds / STEP);
  for (let s = 0; s < steps; s++) {
    step(m);
    if (m.still) break;
    // Holding, the rest settle around a saint who no longer moves; stop once they have.
    if (m.held >= 0 && s > 30 && calm(m)) break;
  }
  m.exact = exact;
  for (const v of m.v) v.x = v.y = 0;
}

function calm(m: WebMotion): boolean {
  for (let i = 0; i < m.v.length; i++) {
    if (i === m.held) continue;
    if (Math.hypot(m.v[i].x, m.v[i].y) > STILL_SPEED) return false;
  }
  return true;
}

/** What a page keeps of the web while the reader stays on it: where each saint rests and stands. */
export type WebPlaces = { anchor: (Point | null)[]; p: Point[] };

export function keepPlaces(m: WebMotion): WebPlaces {
  return {
    anchor: m.anchor.map((a, i) => (i > 0 && dist(a, m.home[i]) > 0.5 ? copy(a) : null)),
    p: m.p.map(copy),
  };
}

/** The web as the reader left it, on coming back to the Web from the Timeline. */
export function restorePlaces(m: WebMotion, kept: WebPlaces | undefined): void {
  if (!kept || kept.p.length !== m.p.length) return;
  for (let i = 1; i < m.p.length; i++) {
    const a = kept.anchor[i];
    if (!a) continue;
    m.anchor[i] = copy(a);
    m.k[i] = MOTION.stay;
    m.zeta[i] = MOTION.stayDamping;
  }
  for (let i = 1; i < m.p.length; i++) m.rest[i] = dist(m.anchor[i], restEnd(m, i));
  for (let i = 0; i < m.p.length; i++) {
    m.p[i] = copy(kept.p[i]);
    m.v[i] = { x: 0, y: 0 };
  }
  m.held = -1;
  m.placed = -1;
  m.flying.fill(false);
  m.still = false;
}

/**
 * A thread, as an SVG path in the web's units: straight while it is taut,
 * hanging a little while it is slack, the bow falling as a loose thread falls.
 */
export function threadPath(from: Point, to: Point, rest: number): string {
  const len = dist(from, to);
  const slack = Math.max(0, rest - len);
  const f = (v: number) => (Math.round(v * 100) / 100).toString();
  if (slack < 0.5) return `M${f(from.x)} ${f(from.y)}L${f(to.x)} ${f(to.y)}`;
  const sag = Math.min(30, 0.45 * Math.sqrt(rest * slack));
  const cx = (from.x + to.x) / 2;
  const cy = (from.y + to.y) / 2 + sag * 1.6;
  return `M${f(from.x)} ${f(from.y)}Q${f(cx)} ${f(cy)} ${f(to.x)} ${f(to.y)}`;
}

/** How much thinner a stretched thread is drawn: its rest length over its length, never under 0.72. */
export function threadThinning(from: Point, to: Point, rest: number): number {
  const len = dist(from, to);
  if (len <= 0) return 1;
  return Math.max(0.72, Math.min(1, rest / len));
}
