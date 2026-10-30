// Moving the saints on the web (1.8, round 3, r3-06 drag B; lib/saints/
// webMotion.ts). There is no browser here, so the feel is held by its
// numbers. What a reader would notice if this broke: the web drifting on its
// own, a saint let go that springs back or slides off, saints left on top of
// one another, the saint in the middle pushed off his place, a saint dragged
// off the screen, Put back leaving one behind, or, with the motion off, a
// saint that swings after the finger lets go.

import { describe, expect, it } from "vitest";

import { BOX, WEB_WIDTH, webLayout } from "@/lib/saints/webLayout";
import {
  MIDDLE_ROOM,
  NODE_ROOM,
  STEP,
  grab,
  keepPlaces,
  letGo,
  moved,
  pull,
  putBack,
  restorePlaces,
  settle,
  step,
  threadPath,
  threadThinning,
  webMotion,
  type Point,
  type WebMotion,
} from "@/lib/saints/webMotion";

const far = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const none = (n: number) => Array.from({ length: n }, () => -1);

/** Run the springs for a while, a finger on a saint or not. */
function run(m: WebMotion, seconds: number) {
  for (let s = 0; s < Math.round(seconds / STEP); s++) step(m);
}

/** How deep two saints' rooms meet: under 1 they overlap (the rounded box the springs use). */
function meet(m: WebMotion, i: number, j: number): number {
  const a = m.room[i];
  const b = m.room[j];
  const u = (m.p[j].x - m.p[i].x) / (a.hx + b.hx);
  const w = (m.p[j].y + b.off - (m.p[i].y + a.off)) / (a.hy + b.hy);
  return Math.sqrt(Math.sqrt(u ** 4 + w ** 4));
}

/** Move node `node` (its body is node + 1) to `to`, the finger moving there over a second, and let go. */
function moveTo(m: WebMotion, node: number, to: Point) {
  grab(m, node + 1);
  const from = { ...m.p[node + 1] };
  for (let s = 1; s <= 240; s++) {
    const k = s / 240;
    pull(m, { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k });
    step(m);
  }
  run(m, 0.4);
  letGo(m);
}

describe("the web at rest", () => {
  it("does not move at its own places, for every size of web the app has and more", () => {
    for (let n = 0; n <= 24; n++) {
      const m = webMotion(webLayout(n), none(n));
      const home = m.p.map((p) => ({ ...p }));
      run(m, 1);
      for (const [i, p] of m.p.entries()) expect(far(p, home[i]), `n=${n} #${i}`).toBeLessThan(0.01);
      expect(m.still, `n=${n}`).toBe(true);
      expect(moved(m)).toBe(false);
    }
  });

  it("hangs a father from the council he sat at", () => {
    // Node 2 hangs from node 0, as a council's father hangs from the council.
    const m = webMotion(webLayout(4), [-1, -1, 0, -1]);
    expect(m.parent).toEqual([-1, 0, 0, 1, 0]);
    expect(m.rest[3]).toBeCloseTo(far(m.home[3], m.home[1]), 6);
    run(m, 1);
    expect(m.still).toBe(true);
  });

  it("measures each saint's room as the layout does", () => {
    expect(NODE_ROOM).toEqual({ hx: BOX.half, hy: 48.5, off: 24.5 });
    expect(MIDDLE_ROOM).toEqual({ hx: 90, hy: 79, off: 21 });
  });
});

describe("a saint moved (B: he stays where he is put)", () => {
  const layout = webLayout(9);
  // An empty corner of St John's nine: up and to the right, clear of everyone.
  const corner = { x: 330, y: 60 };

  it("stays where he is put, his line at its new length, and the saint in the middle is home again", () => {
    const m = webMotion(layout, none(9));
    moveTo(m, 0, corner);
    run(m, 6);
    expect(far(m.p[1], corner)).toBeLessThan(1.5);
    expect(m.rest[1]).toBeCloseTo(far(m.anchor[1], m.home[0]), 6);
    expect(far(m.p[0], m.home[0])).toBeLessThan(0.5);
    expect(moved(m)).toBe(true);
    expect(m.still).toBe(true);
  });

  it("tugs the saint in the middle a little while he is held, never far", () => {
    const m = webMotion(layout, none(9));
    grab(m, 1);
    pull(m, { x: m.home[1].x, y: m.home[1].y + 140 });
    run(m, 1);
    const tug = far(m.p[0], m.home[0]);
    expect(tug).toBeGreaterThan(0.5);
    expect(tug).toBeLessThan(40);
  });

  it("makes room: the saint whose place he is dropped on moves aside, and they part", () => {
    const m = webMotion(layout, none(9));
    // St Olympias onto St John Cassian's place (node 4).
    moveTo(m, 0, { ...m.home[5] });
    run(m, 6);
    expect(far(m.p[5], m.home[5])).toBeGreaterThan(10);
    expect(meet(m, 1, 5)).toBeGreaterThan(0.8);
  });

  it("never pushes the saint in the middle: one dropped on him is moved off instead", () => {
    const m = webMotion(layout, none(9));
    moveTo(m, 0, { x: m.home[0].x + 10, y: m.home[0].y + 5 });
    run(m, 6);
    expect(far(m.p[0], m.home[0])).toBeLessThan(0.5);
    expect(meet(m, 0, 1)).toBeGreaterThan(0.75);
  });

  it("keeps every saint on the canvas, held or let go", () => {
    const m = webMotion(layout, none(9));
    grab(m, 3);
    pull(m, { x: 2000, y: -900 });
    run(m, 1);
    const { x0, x1, y0, y1 } = m.bounds;
    expect(m.p[3].x).toBeLessThanOrEqual(x1 + 24.5);
    expect(m.p[3].y).toBeGreaterThanOrEqual(y0 - 24.5);
    letGo(m);
    run(m, 6);
    for (const [i, p] of m.p.entries()) {
      if (i === 0) continue;
      expect(p.x, `#${i}`).toBeGreaterThanOrEqual(x0 - 1);
      expect(p.x, `#${i}`).toBeLessThanOrEqual(x1 + 1);
      expect(p.y, `#${i}`).toBeGreaterThanOrEqual(y0 - 1);
      expect(p.y, `#${i}`).toBeLessThanOrEqual(y1 + 1);
    }
    expect(x1).toBeLessThanOrEqual(WEB_WIDTH);
  });

  it("brings the saints joined to a moved council along on their threads", () => {
    // Node 2 hangs from node 0 (a council and its father).
    const m = webMotion(webLayout(4), [-1, -1, 0, -1]);
    const start = { ...m.p[3] };
    grab(m, 1);
    pull(m, { x: m.home[1].x - 40, y: m.home[1].y + 90 });
    run(m, 1);
    expect(far(m.p[3], start)).toBeGreaterThan(1);
  });

  it("can never take the saint in the middle", () => {
    const m = webMotion(layout, none(9));
    grab(m, 0);
    expect(m.held).toBe(-1);
  });
});

describe("any reader's hand", () => {
  it("leaves every web still, whole and on the canvas, with the saint in the middle home", () => {
    // A fixed run of drags, the same every time: up to fourteen saints, as the app's largest web.
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let n = 1; n <= 14; n++) {
      const layout = webLayout(n);
      const parents = Array.from({ length: n }, (_, i) => (i > 1 && rand() < 0.3 ? Math.floor(rand() * i) : -1));
      const m = webMotion(layout, parents);
      for (let d = 0; d < 6; d++) {
        const node = Math.floor(rand() * n);
        moveTo(m, node, { x: 20 + rand() * 350, y: rand() * layout.height });
        let s = 0;
        while (!m.still && s < 240 * 12) {
          step(m);
          s++;
        }
        expect(m.still, `n=${n} drag ${d} never stilled`).toBe(true);
        for (const [i, p] of m.p.entries()) {
          expect(Number.isFinite(p.x) && Number.isFinite(p.y), `n=${n} #${i}`).toBe(true);
          if (i === 0) continue;
          expect(p.x, `n=${n} #${i}`).toBeGreaterThanOrEqual(m.bounds.x0 - 6.01);
          expect(p.x, `n=${n} #${i}`).toBeLessThanOrEqual(m.bounds.x1 + 6.01);
          expect(p.y, `n=${n} #${i}`).toBeGreaterThanOrEqual(m.bounds.y0 - 6.01);
          expect(p.y, `n=${n} #${i}`).toBeLessThanOrEqual(m.bounds.y1 + 6.01);
        }
        expect(far(m.p[0], m.home[0]), `n=${n}`).toBeLessThan(0.5);
      }
      putBack(m);
      run(m, 10);
      for (const [i, p] of m.p.entries()) expect(far(p, m.home[i]), `n=${n} #${i} after Put back`).toBeLessThan(0.5);
    }
  });
});

describe("Put back", () => {
  it("returns every saint to the web's own places", () => {
    const m = webMotion(webLayout(9), none(9));
    moveTo(m, 0, { x: 330, y: 60 });
    moveTo(m, 3, { ...m.home[6] });
    run(m, 3);
    expect(moved(m)).toBe(true);
    putBack(m);
    run(m, 8);
    expect(moved(m)).toBe(false);
    for (const [i, p] of m.p.entries()) expect(far(p, m.home[i]), `#${i}`).toBeLessThan(0.5);
  });
});

describe("with Purify's motion off", () => {
  it("puts the held saint where the finger is, and nothing swings after", () => {
    const m = webMotion(webLayout(9), none(9));
    m.exact = true;
    grab(m, 1);
    const to = { x: 330, y: 60 };
    pull(m, to);
    expect(m.p[1]).toEqual(to);
    settle(m);
    expect(m.p[1]).toEqual(to);
    letGo(m);
    settle(m);
    m.exact = false;
    const after = m.p.map((p) => ({ ...p }));
    run(m, 1);
    for (const [i, p] of m.p.entries()) expect(far(p, after[i]), `#${i}`).toBeLessThan(0.05);
    expect(far(m.p[1], to)).toBeLessThan(0.05);
  });
});

describe("the places kept on a visit", () => {
  it("come back as they were, coming back from the Timeline", () => {
    const layout = webLayout(9);
    const m = webMotion(layout, none(9));
    moveTo(m, 0, { x: 330, y: 60 });
    run(m, 6);
    const kept = keepPlaces(m);
    expect(kept.anchor[0]).toBeNull();
    expect(kept.anchor[1]).not.toBeNull();
    expect(kept.anchor.filter(Boolean)).toHaveLength(1);
    const again = webMotion(layout, none(9));
    restorePlaces(again, kept);
    settle(again);
    for (const [i, p] of again.p.entries()) expect(far(p, m.p[i]), `#${i}`).toBeLessThan(0.5);
    expect(moved(again)).toBe(true);
  });

  it("are left alone when they belong to another web", () => {
    const m = webMotion(webLayout(3), none(3));
    restorePlaces(m, keepPlaces(webMotion(webLayout(9), none(9))));
    expect(moved(m)).toBe(false);
  });
});

describe("a thread", () => {
  it("is straight while taut and hangs while slack", () => {
    expect(threadPath({ x: 0, y: 0 }, { x: 100, y: 0 }, 100)).toBe("M0 0L100 0");
    expect(threadPath({ x: 0, y: 0 }, { x: 100, y: 0 }, 80)).toBe("M0 0L100 0");
    const slack = threadPath({ x: 0, y: 0 }, { x: 60, y: 0 }, 100);
    expect(slack).toMatch(/^M0 0Q30 \d+(?:\.\d+)? 60 0$/);
    expect(Number(slack.split(" ")[2])).toBeGreaterThan(0);
  });

  it("thins as it stretches, never under 0.72 of its width", () => {
    expect(threadThinning({ x: 0, y: 0 }, { x: 100, y: 0 }, 100)).toBe(1);
    expect(threadThinning({ x: 0, y: 0 }, { x: 125, y: 0 }, 100)).toBeCloseTo(0.8, 6);
    expect(threadThinning({ x: 0, y: 0 }, { x: 400, y: 0 }, 100)).toBe(0.72);
  });
});
