import { describe, expect, it } from "vitest";

import { HISTORY_ERAS } from "@/lib/history/events";
import { eraKey } from "@/lib/history/labels";
import { historyMap } from "@/lib/history/map";

import {
  DOOR_ASPECT,
  HOUSE,
  LIFT,
  ROW,
  T,
  camBetween,
  clampCam,
  cubicBezier,
  digitTurns,
  digitsOf,
  eraNameKey,
  eraRuns,
  flingTo,
  frameFor,
  liftBetween,
  nameLines,
  overview,
  placeLabels,
  rubber,
  stepAtMark,
  stillView,
  threadCurve,
  toScreen,
  zoomsFor,
  type Box,
  type Geo,
  type LabelAsk,
  type Spot,
} from "../atlas";
import { councilMap } from "../map";

// The atlas (1.8, the owner's pick C of r3-10): the view easing to each
// event's place and lifting between places far apart, names that never
// collide or are cut, threads that bow north, the wheel that comes to rest on
// a whole row, and the year's digits turning the right way.

/** The design's phone, 390 by 844: the year above 206, the wheel from 574. */
const PHONE: Geo = {
  w: 390,
  h: 844,
  safe: { x0: 14, y0: 206, x1: 376, y1: 560 },
  vis: { y0: 120, y1: 576 },
  mapW: 1000,
  mapH: 648,
};

describe("the view", () => {
  it("comes as close as drawn on the design's phone", () => {
    const z = zoomsFor(PHONE);
    expect(z.zClose).toBeCloseTo(1.5, 5);
    expect(z.zMin).toBeCloseTo(0.7, 5);
    expect(z.zFloor).toBeLessThanOrEqual(z.zMin);
    expect(z.zCeil).toBeGreaterThan(z.zClose);
  });

  it("frames every step's place, and where its threads begin, inside the clear between the year and the wheel", () => {
    const { places, steps } = historyMap();
    const at = new Map(places.map((p) => [p.id, p]));
    const zooms = zoomsFor(PHONE);
    steps.forEach((s, i) => {
      if (!s.mark) return;
      const lit = places.filter((p) => steps.findIndex((x) => x.mark === p.id) <= i);
      const from = s.from.map((m) => at.get(m)!);
      const cam = frameFor(PHONE, zooms, at.get(s.mark)!, from, lit);
      const q = toScreen(PHONE, cam, at.get(s.mark)!);
      expect(q.x, `${s.year} ${s.name}`).toBeGreaterThanOrEqual(PHONE.safe.x0);
      expect(q.x, `${s.year} ${s.name}`).toBeLessThanOrEqual(PHONE.safe.x1);
      expect(q.y, `${s.year} ${s.name}`).toBeGreaterThanOrEqual(PHONE.safe.y0);
      expect(q.y, `${s.year} ${s.name}`).toBeLessThanOrEqual(PHONE.safe.y1);
      for (const f of from) {
        const r = toScreen(PHONE, cam, f);
        expect(r.x, `${s.year} from ${f.place}`).toBeGreaterThanOrEqual(0);
        expect(r.x, `${s.year} from ${f.place}`).toBeLessThanOrEqual(PHONE.w);
      }
    });
  });

  it("keeps the view on the map", () => {
    const zooms = zoomsFor(PHONE);
    const c = clampCam(PHONE, { cx: -500, cy: -500, z: zooms.zClose });
    const corner = toScreen(PHONE, c, { x: 0, y: 0 });
    expect(corner.x).toBeLessThanOrEqual(PHONE.w);
    expect(corner.x).toBeGreaterThanOrEqual(0);
    const all = overview(PHONE, zooms, historyMap().places);
    for (const p of historyMap().places) {
      const q = toScreen(PHONE, all, p);
      expect(q.x, p.place).toBeGreaterThan(0);
      expect(q.x, p.place).toBeLessThan(PHONE.w);
    }
  });

  it("travels straight, and lifts away between places far apart only", () => {
    const a = { cx: 400, cy: 340, z: 1.5 };
    const b = { cx: 820, cy: 470, z: 1.5 };
    expect(camBetween(a, b, 0, 0.3)).toEqual(a);
    expect(camBetween(a, b, 1, 0.3).cx).toBeCloseTo(b.cx);
    expect(camBetween(a, b, 0.5, liftBetween(a, b)).z).toBeLessThan(1.5 * (1 - LIFT) + 0.01);
    expect(liftBetween(a, { ...a, cx: a.cx + 20 })).toBeLessThan(0.03);
    expect(liftBetween(a, b)).toBe(LIFT);
  });

  it("eases on the house curve", () => {
    expect(HOUSE(0)).toBe(0);
    expect(HOUSE(1)).toBe(1);
    expect(HOUSE(0.5)).toBeGreaterThan(0.8);
    const linear = cubicBezier(0.25, 0.25, 0.75, 0.75);
    expect(linear(0.3)).toBeCloseTo(0.3, 3);
  });
});

describe("the threads", () => {
  it("bow to the north of the line between two places", () => {
    const q = threadCurve({ x: 100, y: 300 }, { x: 400, y: 300 });
    expect(q.c.y).toBeLessThan(300);
    const back = threadCurve({ x: 400, y: 300 }, { x: 100, y: 300 });
    expect(back.c.y).toBeLessThan(300);
    expect(300 - q.c.y).toBeLessThanOrEqual(80);
  });
});

describe("the names", () => {
  it("put a mark of two places on two lines", () => {
    expect(nameLines("Constantinople and Chalcedon")).toEqual(["Constantinople", "and Chalcedon"]);
    expect(nameLines("Kyiv")).toEqual(["Kyiv"]);
  });

  it("never collide, never cut, never lie over the year or the wheel", () => {
    const asks: LabelAsk[] = [];
    // A crowded corner: a dozen marks within a hundred pixels.
    for (let i = 0; i < 12; i++) asks.push({ id: `p${i}`, x: 180 + (i % 4) * 22, y: 300 + Math.floor(i / 4) * 24, w: 70, lines: 1, cur: i === 0, side: "right" });
    asks.push({ id: "edge", x: 386, y: 400, w: 80, lines: 1, cur: false, side: "right" });
    const obstacles: Box[] = [
      [0, 40, 258, 168],
      [0, 574, 390, 270],
    ];
    const dots = asks.map((a) => ({ id: a.id, x: a.x, y: a.y, r: a.cur ? 16 : 5.5 }));
    const placed = placeLabels(asks, { w: 390, h: 844, obstacles, dots, mem: new Map<string, Spot>() });
    const boxes = [...placed.values()].map((p) => p.box);
    expect(placed.get("p0"), "the place now is always named").toBeDefined();
    expect(placed.get("edge")?.spot, "a name at the edge goes to the other side").toBe("left");
    for (const [i, a] of boxes.entries()) {
      expect(a[0]).toBeGreaterThanOrEqual(6);
      expect(a[0] + a[2]).toBeLessThanOrEqual(384);
      for (const o of obstacles) expect(a[1] + a[3] <= o[1] || a[1] >= o[1] + o[3] || a[0] >= o[0] + o[2]).toBe(true);
      for (const b of boxes.slice(i + 1)) {
        const overlap = a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
        expect(overlap).toBe(false);
      }
    }
    // Some of the crowd find no room, and are left out rather than laid over.
    expect(placed.size).toBeLessThan(asks.length);
  });

  it("keep their side as the view moves", () => {
    const mem = new Map<string, Spot>([["a", "left"]]);
    const placed = placeLabels([{ id: "a", x: 200, y: 400, w: 50, lines: 1, cur: false, side: "right" }], { w: 390, h: 844, obstacles: [], dots: [], mem });
    expect(placed.get("a")?.spot).toBe("left");
  });
});

describe("the steps", () => {
  it("run in ages, each age one run", () => {
    expect(eraRuns(["a", "a", "b", "b", "c"])).toEqual([
      { era: "a", a: 0, b: 1 },
      { era: "b", a: 2, b: 3 },
      { era: "c", a: 4, b: 4 },
    ]);
    for (const { steps } of [historyMap(), councilMap()]) {
      const runs = eraRuns(steps.map((s) => s.era));
      expect(new Set(runs.map((r) => r.era)).size, "an age that comes back would be named twice").toBe(runs.length);
    }
  });

  it("go from a tap on a city to the latest thing there, or the first to come", () => {
    const marks = ["rome", "antioch", "rome", null, "rome"];
    expect(stepAtMark(marks, "rome", 3)).toBe(2);
    expect(stepAtMark(marks, "antioch", 0)).toBe(1);
    expect(stepAtMark(marks, "kyiv", 4)).toBe(-1);
  });

  it("name the ages by the catalog's own keys", () => {
    for (const e of HISTORY_ERAS) {
      expect(eraNameKey(e.id, "label")).toBe(eraKey(e.id, "label"));
      expect(eraNameKey(e.id, "short")).toBe(eraKey(e.id, "short"));
    }
  });

  it("play the whole history in about a minute, one event a second", () => {
    expect(T.play).toBeGreaterThanOrEqual(900);
    expect(T.play).toBeLessThanOrEqual(1200);
    expect((historyMap().steps.length * T.play) / 1000).toBeLessThan(70);
  });
});

describe("the door's still", () => {
  it("holds every place at the card's proportions", () => {
    for (const { places, view } of [historyMap(), councilMap()]) {
      const [x, y, w, h] = stillView(places, view, DOOR_ASPECT);
      expect(w / h).toBeCloseTo(DOOR_ASPECT, 5);
      for (const p of places) {
        expect(p.x, p.place).toBeGreaterThan(x);
        expect(p.x, p.place).toBeLessThan(x + w);
        expect(p.y, p.place).toBeGreaterThan(y);
        expect(p.y, p.place).toBeLessThan(y + h);
      }
    }
  });
});

describe("the wheel", () => {
  it("rows are as drawn", () => {
    expect(ROW).toBe(50);
  });

  it("comes to rest on a whole row, further for a faster flick, never past the ends", () => {
    const slow = flingTo(10.3, 0.004, 52);
    const fast = flingTo(10.3, 0.04, 52);
    expect(Number.isInteger(slow.to)).toBe(true);
    expect(fast.to).toBeGreaterThan(slow.to);
    expect(flingTo(50.6, 0.08, 52).to).toBe(51);
    expect(flingTo(1.2, -0.08, 52).to).toBe(0);
    expect(flingTo(7.4, 0, 52)).toEqual({ to: 7, ms: expect.any(Number) });
    expect(fast.ms).toBeLessThanOrEqual(1500);
  });

  it("gives a little past either end, and no more", () => {
    expect(rubber(5, 52)).toBe(5);
    expect(rubber(-1, 52)).toBeGreaterThan(-1);
    expect(rubber(-10, 52)).toBeGreaterThanOrEqual(-0.9);
    expect(rubber(60, 52)).toBeLessThanOrEqual(51.9);
  });
});

describe("the year", () => {
  it("has no thousands before 1000", () => {
    expect(digitsOf(325)).toEqual([-1, 3, 2, 5]);
    expect(digitsOf(1054)).toEqual([1, 0, 5, 4]);
    expect(digitsOf(33)).toEqual([-1, -1, 3, 3]);
  });

  it("rolls its digits up going forward and down going back", () => {
    expect(digitTurns(325, 330)).toEqual([0, 0, 1, 5]);
    expect(digitTurns(330, 325)).toEqual([0, 0, -1, -5]);
    // 988 to 1054: the thousands comes in; 9 to 0 is one place on.
    expect(digitTurns(988, 1054)).toEqual([0, 1, 7, 6]);
  });
});
