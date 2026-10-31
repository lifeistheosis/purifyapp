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
  CARD_CLEAR,
  FLING,
  MIDDLE_ROOM,
  MIN_FLING,
  NODE_ROOM,
  STEP,
  advanceGlide,
  afterPull,
  aimFrame,
  dropToMiddle,
  fingerSpeed,
  flickOf,
  flingPan,
  frameAt,
  framed,
  givePan,
  giveway,
  glide,
  grab,
  keepPan,
  keepPlaces,
  keepTrack,
  letGo,
  liftToChosen,
  moved,
  openOf,
  panRange,
  pull,
  pullCard,
  putBack,
  restorePlaces,
  settle,
  settleFrame,
  step,
  threadPath,
  threadThinning,
  throwFrame,
  webBox,
  webFrame,
  webMotion,
  webTarget,
  type Point,
  type Track,
  type WebMotion,
  type WebScreen,
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

  it("make room again round a saint left on another's place", () => {
    const layout = webLayout(9);
    const m = webMotion(layout, none(9));
    moveTo(m, 0, { ...m.home[5] });
    run(m, 6);
    const again = webMotion(layout, none(9));
    restorePlaces(again, keepPlaces(m));
    settle(again);
    expect(far(again.p[1], m.p[1])).toBeLessThan(3);
    expect(meet(again, 1, 5)).toBeGreaterThan(0.8);
    expect(far(again.p[0], again.home[0])).toBeLessThan(0.5);
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

// ---- The web's place on the screen (the build 84 note 45) ----
//
// The owner's photo: St Macarius's web (six saints round him) pinned under the
// key with a third of the screen empty above the short card. What a reader
// would notice if this broke: the gap again, the web leaping instead of riding
// up with the card, the chosen saint hidden under the pulled-up card, a web
// moved by hand lost off the screen, or the card that will not follow the
// finger.
//
// The phone here is a 412 by 915 one in the apps: the status bar 24px, the bar
// 48px under it, the key from 80 to 130, the canvas from 138; the tab bar 86px
// over a 16px home strip, the card's foot 4px over it (106 from the window's
// foot), the handle's top 34px under the short card's foot.

const VH = 915;
const CARD_BOTTOM = 16 + 86 + 4;
const SLOT_TOP = 138;
const BAR = 72;

function phone(nodes: number, { tall = 500, chosen = 0, floor = Infinity }: { tall?: number; chosen?: number; floor?: number } = {}): WebScreen {
  const layout = webLayout(nodes);
  const box = webBox(layout);
  const at = layout.places[chosen] ?? layout.center;
  return {
    bandTop: BAR,
    shortTop: VH - CARD_BOTTOM - 78,
    tallTop: VH - CARD_BOTTOM - tall,
    handleTop: VH - (16 + 86 - 6) - 40,
    web: { middle: SLOT_TOP + box.middle, top: SLOT_TOP + box.top, bottom: SLOT_TOP + box.bottom },
    floor,
    chosen: { top: SLOT_TOP + at.y - BOX.up, bottom: SLOT_TOP + at.y + BOX.down },
  };
}
const SHORT = { open: 0, drop: 0, tucked: false };
const TALL = { open: 1, drop: 0, tucked: false };
const STILL: Point = { x: 0, y: 0 };

describe("the web's own box", () => {
  it("is the layout's, inside its padding, for every size of web", () => {
    for (let n = 1; n <= 16; n++) {
      const layout = webLayout(n);
      const box = webBox(layout);
      expect(box.top, `n=${n}`).toBe(14);
      expect(box.bottom, `n=${n}`).toBe(layout.height - 14);
      expect(box.middle).toBe(layout.center.y);
    }
  });
});

describe("the web with the card short or tucked", () => {
  it("stands St Macarius in the middle of the space between the bar and the card", () => {
    const s = phone(6);
    const y = webTarget(s, SHORT, STILL, "short").y;
    // Down from under the key, about 94px on this phone.
    expect(y).toBeGreaterThan(80);
    expect(s.web.middle + y).toBeCloseTo((s.bandTop + s.shortTop) / 2, 6);
    // His last name still clear of the card.
    expect(s.web.bottom + y).toBeLessThanOrEqual(s.shortTop - CARD_CLEAR);
  });

  it("stands him in the middle down to the handle when the card is tucked away", () => {
    const s = phone(6);
    const y = webTarget(s, { open: 0, drop: 0, tucked: true }, STILL, "short").y;
    expect(s.web.middle + y).toBeCloseTo((s.bandTop + s.handleTop) / 2, 6);
  });

  it("follows the short card down as a finger takes it toward its handle, no further than the handle", () => {
    const s = phone(6);
    const short = webTarget(s, SHORT, STILL, "short").y;
    const half = webTarget(s, { open: 0, drop: 20, tucked: false }, STILL, "short").y;
    const far = webTarget(s, { open: 0, drop: 300, tucked: false }, STILL, "short").y;
    const tucked = webTarget(s, { open: 0, drop: 0, tucked: true }, STILL, "short").y;
    expect(half).toBeCloseTo(short + 10, 6);
    expect(far).toBeCloseTo(tucked, 6);
  });

  it("never lifts the web above its own place under the key, nor brings its last name onto the card", () => {
    // The middle of the band above the web's own middle: it stays where it is.
    expect(dropToMiddle({ top: 0, bottom: 300 }, { middle: 300, bottom: 400 })).toBe(0);
    // Room for less than the middle would want: down as far as the card allows.
    expect(dropToMiddle({ top: 0, bottom: 600 }, { middle: 100, bottom: 520 })).toBe(600 - CARD_CLEAR - 520);
    // Nor past the foot of the room it is drawn in.
    expect(dropToMiddle({ top: 0, bottom: 800 }, { middle: 100, bottom: 300 }, 350)).toBe(50);
  });

  it("leaves a web taller than the screen at its own place, for the page to scroll", () => {
    const s = phone(14);
    expect(s.web.bottom).toBeGreaterThan(s.shortTop);
    expect(webTarget(s, SHORT, STILL, "short").y).toBe(0);
  });
});

describe("the web as the card is pulled up", () => {
  it("stands the chosen saint in the middle of what the pulled-up card leaves above it", () => {
    for (const chosen of [0, 2, 3, 5]) {
      const s = phone(6, { chosen });
      const y = webTarget(s, TALL, STILL, "short").y;
      expect((s.chosen.top + s.chosen.bottom) / 2 + y, `#${chosen}`).toBeCloseTo((s.bandTop + s.tallTop) / 2, 6);
      expect(s.chosen.top + y, `#${chosen}`).toBeGreaterThanOrEqual(s.bandTop);
      expect(s.chosen.bottom + y, `#${chosen}`).toBeLessThanOrEqual(s.tallTop);
    }
  });

  it("goes with the card the whole way: halfway up, halfway between its two places", () => {
    const s = phone(6);
    const short = webTarget(s, SHORT, STILL, "short").y;
    const tall = webTarget(s, TALL, STILL, "short").y;
    expect(tall).toBeLessThan(0);
    expect(webTarget(s, { open: 0.5, drop: 0, tucked: false }, STILL, "short").y).toBeCloseTo((short + tall) / 2, 6);
    // Every step of the pull is a step of the web, never a leap.
    let last = short;
    for (let o = 0.05; o <= 1.0001; o += 0.05) {
      const y = webTarget(s, { open: o, drop: 0, tucked: false }, STILL, "short").y;
      expect(Math.abs(y - last)).toBeLessThan(Math.abs(tall - short) / 19);
      last = y;
    }
  });

  it("puts a chosen saint taller than the room just under the bar", () => {
    expect(liftToChosen({ top: 72, bottom: 150 }, { top: 300, bottom: 397 })).toBe(76 - 300);
  });

  it("leaves a move of the web behind on the side of the card it was made on", () => {
    const pan = { x: 40, y: -30 };
    // Made with the card short: whole while short, gone once pulled up.
    expect(framed(100, -150, 0, pan, "short")).toEqual({ x: 40, y: 70 });
    expect(framed(100, -150, 1, pan, "short")).toEqual({ x: 0, y: -150 });
    expect(framed(100, -150, 0.5, pan, "short")).toEqual({ x: 20, y: -40 });
    // Made with the card pulled up: whole while pulled up, gone once it is short.
    expect(framed(100, -150, 1, pan, "tall")).toEqual({ x: 40, y: -180 });
    expect(framed(100, -150, 0, pan, "tall")).toEqual({ x: 0, y: 100 });
  });
});

describe("the card under a finger", () => {
  it("follows the finger up one for one to its full height, then gives", () => {
    expect(pullCard({ height: 78, drop: 0 }, -100, 78, 500, true)).toEqual({ height: 178, drop: 0 });
    expect(pullCard({ height: 78, drop: 0 }, -422, 78, 500, true)).toEqual({ height: 500, drop: 0 });
    const past = pullCard({ height: 78, drop: 0 }, -1000, 78, 500, true);
    expect(past.height).toBeGreaterThan(500);
    expect(past.height).toBeLessThan(500 + 96);
  });

  it("drops with the finger toward its handle when short, and only gives below short when pulled up", () => {
    expect(pullCard({ height: 78, drop: 0 }, 40, 78, 500, true)).toEqual({ height: 78, drop: 40 });
    expect(pullCard({ height: 500, drop: 0 }, 100, 78, 500, false)).toEqual({ height: 400, drop: 0 });
    const below = pullCard({ height: 500, drop: 0 }, 500, 78, 500, false);
    expect(below.height).toBe(78);
    expect(below.drop).toBeGreaterThan(0);
    expect(below.drop).toBeLessThan(78);
  });

  it("is taken where it is, halfway along its spring, without a leap", () => {
    expect(pullCard({ height: 260, drop: 0 }, 0, 78, 500, false)).toEqual({ height: 260, drop: 0 });
    expect(pullCard({ height: 78, drop: 12 }, 0, 78, 500, true)).toEqual({ height: 78, drop: 12 });
  });

  it("says how far it is pulled up, and gives one for one at first and never past its room", () => {
    expect(openOf(78, 78, 500)).toBe(0);
    expect(openOf(289, 78, 500)).toBeCloseTo(0.5, 6);
    expect(openOf(700, 78, 500)).toBe(1);
    expect(openOf(80, 78, 78)).toBe(1);
    expect(giveway(1)).toBeCloseTo(1, 1);
    expect(giveway(96)).toBeCloseTo(48, 6);
    expect(giveway(100000)).toBeLessThan(96);
    expect(giveway(-5)).toBe(0);
  });

  it("opens, tucks or comes back short as the pull or the flick says", () => {
    expect(afterPull("short", -30, 0)).toBe("tall");
    expect(afterPull("short", -10, -0.6)).toBe("tall");
    expect(afterPull("short", 30, 0)).toBe("tucked");
    expect(afterPull("short", -10, 0)).toBeNull();
    expect(afterPull("tall", 30, 0)).toBe("short");
    expect(afterPull("tall", -60, 0)).toBeNull();
    expect(afterPull("handle", -30, 0)).toBe("short");
    expect(afterPull("handle", 30, 0)).toBeNull();
  });

  it("reads the finger's speed from its last moves, and none from a finger that had stopped", () => {
    const track: Track = [];
    for (let t = 0; t <= 200; t += 16) keepTrack(track, t, 0, -2 * t);
    expect(track[track.length - 1].t - track[0].t).toBeLessThanOrEqual(96);
    expect(fingerSpeed(track, 200).y).toBeCloseTo(-2000, 6);
    expect(fingerSpeed(track, 400)).toEqual({ x: 0, y: 0 });
  });
});

describe("the spring the card and the web settle on", () => {
  it("arrives without swinging past, in about half a second", () => {
    const g = glide({ x: 78, y: 0 }, { x: 500, y: 0 });
    let t = 0;
    let most = 0;
    while (advanceGlide(g, 1 / 60) && t < 3) {
      t += 1 / 60;
      most = Math.max(most, g.p.x);
    }
    expect(g.still).toBe(true);
    expect(g.p.x).toBe(500);
    expect(t).toBeLessThan(0.75);
    expect(most).toBeLessThan(500 + 4);
  });

  it("carries on with the speed a finger left it with", () => {
    const g = glide({ x: 300, y: 0 }, { x: 500, y: 0 }, { x: -1500, y: 0 });
    advanceGlide(g, 1 / 60);
    expect(g.p.x).toBeLessThan(300);
    while (advanceGlide(g, 1 / 60));
    expect(g.p.x).toBe(500);
  });
});

describe("the web's place, drawn", () => {
  it("is there at once when carried by the card or a finger", () => {
    const f = webFrame();
    aimFrame(f, { x: 0, y: 90 }, true);
    expect(frameAt(f)).toEqual({ x: 0, y: 90 });
    expect(f.left.still).toBe(true);
  });

  it("glides from where it is drawn to anywhere else it is sent, and arrives", () => {
    const f = webFrame({ x: 0, y: 90 });
    aimFrame(f, { x: 0, y: -140 }, false);
    // Not a leap: drawn where it was.
    expect(frameAt(f)).toEqual({ x: 0, y: 90 });
    while (advanceGlide(f.left, 1 / 60));
    expect(frameAt(f)).toEqual({ x: 0, y: -140 });
  });

  it("keeps a glide under way when the card then carries it on", () => {
    const f = webFrame({ x: 0, y: 0 });
    aimFrame(f, { x: 0, y: 100 }, false);
    advanceGlide(f.left, 0.1);
    const was = frameAt(f).y;
    aimFrame(f, { x: 0, y: 110 }, true);
    expect(frameAt(f).y).toBeCloseTo(was + 10, 6);
  });

  it("carries a flick on and settles; with the motion off it is simply there", () => {
    const f = webFrame();
    throwFrame(f, { x: 800, y: 0 });
    advanceGlide(f.left, 1 / 60);
    expect(frameAt(f).x).toBeGreaterThan(0);
    settleFrame(f);
    expect(frameAt(f)).toEqual({ x: 0, y: 0 });
  });
});

describe("the web moved by hand", () => {
  const space = { left: 56, right: 412 - 56, top: 72 + 56, bottom: 731 - 56 };

  it("goes until the middle saint reaches the edge of the space, and no further once let go", () => {
    const r = panRange({ x: 206, y: 400 }, space);
    expect(r).toEqual({ x0: -150, x1: 150, y0: -272, y1: 275 });
    expect(keepPan({ x: 400, y: -900 }, r)).toEqual({ x: 150, y: -272 });
    expect(keepPan({ x: 20, y: 30 }, r)).toEqual({ x: 20, y: 30 });
  });

  it("always lets the web stay where the card put it, even with the middle saint past an edge", () => {
    const r = panRange({ x: 206, y: 40 }, space);
    expect(r.y0).toBe(0);
    expect(r.y1).toBeGreaterThan(0);
  });

  it("gives under a finger past its edge, never more than a little", () => {
    const r = panRange({ x: 206, y: 400 }, space);
    expect(givePan({ x: 10, y: 10 }, r)).toEqual({ x: 10, y: 10 });
    const past = givePan({ x: 150 + 200, y: 0 }, r);
    expect(past.x).toBeGreaterThan(150);
    expect(past.x).toBeLessThan(150 + 64);
  });

  it("carries a flick a moment on, inside the space, and a hand that only trembled not at all", () => {
    const r = panRange({ x: 206, y: 400 }, space);
    expect(flingPan({ x: 0, y: 0 }, { x: 500, y: 0 }, r)).toEqual({ x: 500 * FLING, y: 0 });
    expect(flingPan({ x: 0, y: 0 }, { x: 0, y: 9000 }, r).y).toBe(r.y1);
    expect(flingPan({ x: 12, y: -8 }, { x: MIN_FLING - 1, y: 0 }, r)).toEqual({ x: 12, y: -8 });
    expect(flickOf({ x: 120, y: -90 })).toEqual({ x: 0, y: 0 });
    expect(flickOf({ x: 600, y: 0 })).toEqual({ x: 600, y: 0 });
  });
});
