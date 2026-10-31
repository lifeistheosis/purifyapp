/**
 * From one saint's web to another's, in place (1.8, the build 80 note 55).
 * The owner: "When you click center the web here, when you're on someone
 * else's profile on someone else's web, make sure the transition from their
 * web to the other person's web is smooth."
 *
 * "Center the web here" was a plain link to the other saint's web, so the
 * route change swapped the whole page and drew the new web from nothing. Now
 * the room stays, and the web changes in it:
 *
 *  - the saint chosen, already on the screen, glides to the middle and grows
 *    to the middle's size, on the middle saint's spring;
 *  - the saint who was in the middle shrinks and goes to his place in the new
 *    web, on the place spring. He is always one of its saints, since every tie
 *    the web draws runs both ways (lib/saints/web.ts); if one day he is not,
 *    he fades out where he stood;
 *  - the saints of both webs go from their old places to their new ones; those
 *    of the old web alone fade out where they stand; those of the new web
 *    alone come out of the new middle once he is half way there;
 *  - the old threads fade as the new ones come in, each drawn between its two
 *    saints wherever they are, and the middle icon's light goes over to his.
 *
 * Back walks the same way: the address names the web, and the room glides to
 * whichever web it names (components/saints/web/SaintWebScreen.tsx).
 *
 * Pure: no DOM and no clock, as lib/saints/webMotion.ts. The places are in the
 * NEW web's canvas units (across, a share of its 390; down, pixels): the new
 * web's own, from lib/saints/webLayout.ts and its springs at rest, and the old
 * web's as they stood on the screen, brought into them by the screen. Sizes
 * are a circle's, in pixels. The springs are the house's (MOTION), stepped a
 * 240th of a second at a time.
 *
 * Here too: the address of a saint's web, and the file a build writes for it
 * (app/saint-webs), so a web can be read on the device with no server.
 */

import { CENTER_SIZE, NODE_SIZE } from "./webLayout";
import { MOTION, STEP, type Point } from "./webMotion";

/* ---- Addresses and files ---- */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The saint whose web an address names: "/saints/basil-the-great/web", or
 * with the slash the apps' export keeps after it. Null for any other page.
 */
export function webSlugOfPath(pathname: string | null | undefined): string | null {
  const m = /^\/saints\/([^/]+)\/web\/?$/.exec(pathname ?? "");
  return m && SLUG.test(m[1]) ? m[1] : null;
}

/** The address of a saint's web, written as the address is now: with the apps' trailing slash, or without. */
export function webPathFor(slug: string, current: string): string {
  return `/saints/${slug}/web${current.endsWith("/") ? "/" : ""}`;
}

/** A saint's web as a file of the build (app/saint-webs/[file]): "basil-the-great.json". */
export function webFileName(slug: string): string {
  return `${slug}.json`;
}

/** "basil-the-great.json" back to its saint; null for anything that is not a web file's name. */
export function slugOfWebFile(file: string): string | null {
  const m = /^(.+)\.json$/.exec(file);
  return m && SLUG.test(m[1]) ? m[1] : null;
}

/** Where the device reads a saint's web: in the apps' bundle, and on the website. */
export function webFileUrl(slug: string): string {
  return `/saint-webs/${webFileName(slug)}`;
}

/* ---- Who goes where ---- */

/** A web as the glide sees it: the saint in the middle, and the ids of everyone round him in the web's order. */
export type GlideWeb = { middle: string; nodes: readonly string[] };

/** The old web as it stood on the screen when the glide began: each circle's centre, its size, and how lit it was. */
export type GlideStart = {
  web: GlideWeb;
  middle: { at: Point; size: number };
  nodes: readonly { at: Point; size: number; opacity: number }[];
};

/** The new web at rest: body 0 is its middle saint, body i + 1 its node i. */
export type GlideEnd = { web: GlideWeb; rest: readonly Point[] };

/**
 * What a saint of the new web does:
 *  - grow: he was round the old middle, and comes to the middle;
 *  - shrink: he was the old middle, and goes to his place round the new one;
 *  - move: he was round the old middle, and goes to his place round the new;
 *  - arrive: he was not on the old web, and comes out of the new middle.
 */
export type GlideRole = "grow" | "shrink" | "move" | "arrive";

export type GlideBody = {
  /** 0 is the new middle; i + 1 is the new web's node i. */
  body: number;
  role: GlideRole;
  from: Point;
  to: Point;
  fromSize: number;
  toSize: number;
  /** How lit he was: a saint the key or the pulled-up card had dimmed brightens as he goes. */
  fromOpacity: number;
  /** The middle saint's spring for the one coming to the middle, the place spring for the rest. */
  spring: "middle" | "place";
};

/** A saint of the old web who is not on the new one: he fades out where he stood. `old` is his node, or -1 for the old middle. */
export type GlideLeaver = { old: number; id: string; at: Point; size: number; opacity: number };

/** Who stands for one of the old web's saints now, so his old thread can be drawn to him as it fades: a body of the new web, or a leaver. */
export type GlideFollow = { body: number } | { leaver: number };

export type GlidePlan = {
  /** Every body of the new web, in order: bodies[b].body === b. */
  bodies: GlideBody[];
  leavers: GlideLeaver[];
  /** For each of the old web's bodies (0, its middle; i + 1, its node i). */
  old: GlideFollow[];
};

const saintId = (slug: string) => `saint:${slug}`;

/** A saint who arrives starts at this share of his size, and grows as he comes out. */
export const ARRIVE_FROM = 0.5;

/**
 * The old web's saints who are not on the new one, in the order the old web
 * has them: -1 is its middle, when he is not one of the new web's saints.
 * The saint who becomes the new middle never leaves.
 */
export function glideLeavers(from: GlideWeb, to: GlideWeb): number[] {
  const kept = new Set(to.nodes);
  const out: number[] = [];
  if (from.middle !== to.middle && !kept.has(saintId(from.middle))) out.push(-1);
  from.nodes.forEach((id, i) => {
    if (id !== saintId(to.middle) && !kept.has(id)) out.push(i);
  });
  return out;
}

/**
 * The glide's plan: where each saint of the new web starts and ends, and who
 * of the old web leaves. Saints are matched by id; the old middle is the new
 * web's `saint:<his slug>`, and the new middle the old web's.
 */
export function glidePlan(start: GlideStart, end: GlideEnd): GlidePlan {
  const oldAt = new Map(start.web.nodes.map((id, i) => [id, i]));
  const newAt = new Map(end.web.nodes.map((id, i) => [id, i]));
  const middleRest = end.rest[0];
  const bodies: GlideBody[] = [];

  // The new middle: the saint chosen, from where he stood round the old one.
  const chosen = oldAt.get(saintId(end.web.middle));
  if (chosen !== undefined) {
    const s = start.nodes[chosen];
    bodies.push({ body: 0, role: "grow", from: s.at, to: middleRest, fromSize: s.size, toSize: CENTER_SIZE, fromOpacity: s.opacity, spring: "middle" });
  } else if (start.web.middle === end.web.middle) {
    bodies.push({ body: 0, role: "move", from: start.middle.at, to: middleRest, fromSize: start.middle.size, toSize: CENTER_SIZE, fromOpacity: 1, spring: "middle" });
  } else {
    // Not on the old web at all (an address to an unrelated web): he comes in where he will stand.
    bodies.push({ body: 0, role: "arrive", from: middleRest, to: middleRest, fromSize: CENTER_SIZE * ARRIVE_FROM, toSize: CENTER_SIZE, fromOpacity: 0, spring: "middle" });
  }

  end.web.nodes.forEach((id, i) => {
    const to = end.rest[i + 1];
    const body = i + 1;
    if (start.web.middle !== end.web.middle && id === saintId(start.web.middle)) {
      bodies.push({ body, role: "shrink", from: start.middle.at, to, fromSize: start.middle.size, toSize: NODE_SIZE, fromOpacity: 1, spring: "place" });
      return;
    }
    const was = oldAt.get(id);
    if (was !== undefined) {
      const s = start.nodes[was];
      bodies.push({ body, role: "move", from: s.at, to, fromSize: s.size, toSize: NODE_SIZE, fromOpacity: s.opacity, spring: "place" });
      return;
    }
    bodies.push({ body, role: "arrive", from: middleRest, to, fromSize: NODE_SIZE * ARRIVE_FROM, toSize: NODE_SIZE, fromOpacity: 0, spring: "place" });
  });

  const leavers: GlideLeaver[] = glideLeavers(start.web, end.web).map((old) =>
    old < 0
      ? { old, id: saintId(start.web.middle), at: start.middle.at, size: start.middle.size, opacity: 1 }
      : { old, id: start.web.nodes[old], at: start.nodes[old].at, size: start.nodes[old].size, opacity: start.nodes[old].opacity },
  );
  const leaverOf = new Map(leavers.map((l, k) => [l.old, k]));

  const follow = (id: string, old: number): GlideFollow => {
    if (id === saintId(end.web.middle)) return { body: 0 };
    const n = newAt.get(id);
    if (n !== undefined) return { body: n + 1 };
    if (id === saintId(start.web.middle) && start.web.middle === end.web.middle) return { body: 0 };
    return { leaver: leaverOf.get(old) ?? 0 };
  };
  const old: GlideFollow[] = [
    follow(saintId(start.web.middle), -1),
    ...start.web.nodes.map((id, i) => follow(id, i)),
  ];

  return { bodies, leavers, old };
}

/* ---- The glide on the house springs ---- */

/** The new middle's share of the way after which the saints new to the web come out of him. */
export const LAUNCH = 0.5;
/** The leavers are gone, and the old threads, by these shares of his way. */
const LEAVE_BY = 0.5;
const OLD_THREADS_BY = 0.4;
/** The new threads come in over this stretch of his way. */
const NEW_THREADS_FROM = 0.3;
const NEW_THREADS_OVER = 0.6;
/** The two who change places change names: the old name gone by the first share, the new one in from the second. */
const NAME_OUT_BY = 0.3;
const NAME_IN_FROM = 0.55;
/** An arrival is all there by this share of his own way. */
const ARRIVED_BY = 0.6;
/** A leaver gives this much of his size as he goes. */
const LEAVE_SHRINK = 0.18;

/** Close enough, and slow enough, to be still: pixels, and pixels a second (as the web's own glide). */
const STILL = 0.25;
const STILL_SPEED = 4;

const SPRINGS = {
  middle: { k: MOTION.middle, zeta: MOTION.middleDamping },
  place: { k: MOTION.place, zeta: MOTION.placeDamping },
} as const;

/**
 * The glide under way. Each body goes the whole of its way on its own spring:
 * `u` is the share of the way it has come (a spring may carry it a little
 * past, and back), `v` how fast. A body that starts and ends in the same place
 * at the same size is still from the start.
 */
export type GlideRun = {
  plan: GlidePlan;
  u: number[];
  v: number[];
  /** The saints new to the web wait in the middle until he is half way there. */
  going: boolean[];
  still: boolean[];
  done: boolean;
};

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * How far a body has to go, in pixels: its way, its change of size, or its
 * brightening (a whole fade counted as a hundred pixels, so it is never cut
 * short), whichever is most.
 */
function reach(b: GlideBody): number {
  return Math.max(dist(b.from, b.to), Math.abs(b.toSize - b.fromSize), (1 - b.fromOpacity) * 100);
}

export function glideRun(plan: GlidePlan): GlideRun {
  const still = plan.bodies.map((b) => reach(b) < STILL);
  return {
    plan,
    u: plan.bodies.map((_, i) => (still[i] ? 1 : 0)),
    v: plan.bodies.map(() => 0),
    going: plan.bodies.map((b) => b.role !== "arrive" || b.body === 0),
    still,
    done: still.every(Boolean),
  };
}

/** One step of every spring. */
export function stepGlideRun(g: GlideRun, dt: number = STEP): void {
  if (g.done) return;
  let done = true;
  g.plan.bodies.forEach((b, i) => {
    if (!g.going[i]) {
      if (g.u[0] >= LAUNCH || g.still[0]) g.going[i] = true;
      else {
        done = false;
        return;
      }
    }
    if (g.still[i]) return;
    const { k, zeta } = SPRINGS[b.spring];
    const c = 2 * zeta * Math.sqrt(k);
    g.v[i] += (k * (1 - g.u[i]) - c * g.v[i]) * dt;
    g.u[i] += g.v[i] * dt;
    const r = reach(b);
    if (Math.abs(1 - g.u[i]) * r < STILL && Math.abs(g.v[i]) * r < STILL_SPEED) {
      g.u[i] = 1;
      g.v[i] = 0;
      g.still[i] = true;
    } else {
      done = false;
    }
  });
  g.done = done;
}

/** A frame's worth (a thirtieth of a second at most, as `advance`, so a page come back to does not leap). True while it moves. */
export function advanceGlideRun(g: GlideRun, seconds: number): boolean {
  if (g.done) return false;
  const steps = Math.max(1, Math.min(8, Math.round(Math.min(seconds, 1 / 30) / STEP)));
  for (let s = 0; s < steps && !g.done; s++) stepGlideRun(g);
  return !g.done;
}

/** The glide's end at once: Purify's motion off, or a reader's finger on the web before it is done. */
export function finishGlideRun(g: GlideRun): void {
  g.u = g.u.map(() => 1);
  g.v = g.v.map(() => 0);
  g.going = g.going.map(() => true);
  g.still = g.still.map(() => true);
  g.done = true;
}

/** Each body as it is drawn now. `nameIn` is how far his new name has come in, `nameOut` how much of his old one is left. */
export type GlideBodyNow = { p: Point; size: number; opacity: number; nameIn: number; nameOut: number };

/** The glide as it is drawn now. */
export type GlideFrame = {
  bodies: GlideBodyNow[];
  leavers: { opacity: number; scale: number }[];
  /** How much of the old threads is left, and how far the new ones have come in. */
  threadsOut: number;
  threadsIn: number;
  /** The new middle's way, 0 to 1: his light comes in as the old middle's goes. */
  arrive: number;
};

export function glideFrame(g: GlideRun): GlideFrame {
  const lead = clamp01(g.u[0] ?? 1);
  const bodies = g.plan.bodies.map((b, i): GlideBodyNow => {
    const u = g.u[i];
    const t = clamp01(u);
    const renamed = b.role === "grow" || b.role === "shrink";
    return {
      p: { x: lerp(b.from.x, b.to.x, u), y: lerp(b.from.y, b.to.y, u) },
      size: Math.max(0, lerp(b.fromSize, b.toSize, u)),
      opacity: b.role === "arrive" ? clamp01(u / ARRIVED_BY) : lerp(b.fromOpacity, 1, t),
      nameIn: renamed ? clamp01((t - NAME_IN_FROM) / (1 - NAME_IN_FROM)) : 1,
      nameOut: renamed ? 1 - clamp01(t / NAME_OUT_BY) : 0,
    };
  });
  const gone = clamp01(lead / LEAVE_BY);
  return {
    bodies,
    leavers: g.plan.leavers.map((l) => ({ opacity: l.opacity * (1 - gone), scale: 1 - LEAVE_SHRINK * gone })),
    threadsOut: 1 - clamp01(lead / OLD_THREADS_BY),
    threadsIn: clamp01((lead - NEW_THREADS_FROM) / NEW_THREADS_OVER),
    arrive: lead,
  };
}

/** Where one of the old web's saints is now, for his old thread: his body in the new web, or where he stands as he leaves. */
export function followAt(plan: GlidePlan, frame: GlideFrame, oldBody: number): Point {
  const f = plan.old[oldBody];
  if (!f) return { x: 0, y: 0 };
  if ("body" in f) return frame.bodies[f.body]?.p ?? { x: 0, y: 0 };
  return plan.leavers[f.leaver]?.at ?? { x: 0, y: 0 };
}
