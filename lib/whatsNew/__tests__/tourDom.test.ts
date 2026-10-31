// The tour on the page (lib/whatsNew/tourDom.ts): what is lit is held to the
// stage between the bars and clear of the story's words, how a stop is
// planned before anything moves, what takes a tap, the house curve the light
// and the page move on, and when a stop is waited for or passed over (the
// owner's note 51 of build 85). Pure arithmetic; the measuring itself is
// walked on the native export.

import { describe, expect, it } from "vitest";

import {
  MIN_LIT_PX,
  PAGE_WAIT_MS,
  QUIET_FRAMES,
  QUIET_MS,
  ROUTE_WAIT_MS,
  STAGE_EDGE,
  STAGE_GAP,
  closedAt,
  cubicBezier,
  footBox,
  houseEase,
  litBox,
  lookVerdict,
  mixBox,
  normalizePath,
  planStop,
  sameBox,
  samePage,
  stageOf,
  tapBlockers,
  type Box,
  type Looking,
  type PlanInput,
} from "../tourDom";

/** A phone as the walk opens it: 390 by 844, no edges of its own. */
const PHONE = { width: 390, height: 844 };
const NO_INSETS = { top: 0, bottom: 0 };
/** The band between a page's bar (to 96) and the tab bar (from 761). */
const BAND = { top: 96, bottom: 761 };
/** The story's foot as it stands on that phone: its night rising 300px from the screen's edge. */
const FOOT = { height: 300 };

const box = (top: number, height: number, left = 13, width = 364): Box => ({ top, left, width, height });

function plan(over: Partial<PlanInput> & { box: Box }) {
  return planStop({
    pinned: false,
    view: PHONE,
    band: BAND,
    insets: NO_INSETS,
    foot: FOOT,
    scrollY: 0,
    maxScrollY: 5000,
    ...over,
  });
}

describe("pages", () => {
  it("are one page with or without the export's trailing slash", () => {
    expect(normalizePath("/theology/")).toBe("/theology");
    expect(normalizePath("/theology")).toBe("/theology");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("//")).toBe("/");
    expect(normalizePath("/community#pray")).toBe("/community");
    expect(normalizePath("/settings?x=1")).toBe("/settings");
    expect(samePage("/saints/john-chrysostom/", "/saints/john-chrysostom")).toBe(true);
    expect(samePage("/saints", "/saints/john-chrysostom")).toBe(false);
    expect(samePage(null, "/")).toBe(true);
  });
});

describe("the stage: what is lit stays between the bars and clear of the words", () => {
  it("stands the story's foot at the screen's edge it is given", () => {
    expect(footBox("bottom", 300, PHONE)).toEqual({ top: 544, bottom: 844 });
    expect(footBox("top", 300, PHONE)).toEqual({ top: 0, bottom: 300 });
    // Never taller than the screen.
    expect(footBox("bottom", 2000, PHONE)).toEqual({ top: 0, bottom: 844 });
  });

  it("ends a gap short of the words, and never reaches past the bars", () => {
    const under = stageOf(BAND, footBox("bottom", 300, PHONE), "bottom", PHONE);
    expect(under).toEqual({ top: 96, bottom: 544 - STAGE_GAP, left: STAGE_EDGE, right: 390 - STAGE_EDGE });
    const over = stageOf(BAND, footBox("top", 300, PHONE), "top", PHONE);
    expect(over).toEqual({ top: 300 + STAGE_GAP, bottom: 761, left: STAGE_EDGE, right: 390 - STAGE_EDGE });
    // A band shorter than the words leave: no room, never a negative one.
    const none = stageOf({ top: 600, bottom: 700 }, footBox("bottom", 300, PHONE), "bottom", PHONE);
    expect(none.bottom).toBe(none.top);
  });

  it("lights only the part of an element on the stage", () => {
    const stage = { top: 96, bottom: 532, left: 4, right: 386 };
    // His photo of build 85: the atlas door ran on under the tab bar.
    expect(litBox(box(420, 400), stage)).toEqual({ top: 420, left: 13, width: 364, height: 112 });
    expect(litBox(box(40, 100), stage)).toEqual({ top: 96, left: 13, width: 364, height: 44 });
    expect(litBox(box(200, 60, 0, 390), stage)).toEqual({ top: 200, left: 4, width: 382, height: 60 });
    // Nothing of it there, or a sliver: nothing is lit.
    expect(litBox(box(600, 100), stage)).toBeNull();
    expect(litBox(box(532 - MIN_LIT_PX + 1, 100), stage)).toBeNull();
  });

  it("is the same to the eye within half a pixel", () => {
    const a = box(10, 50);
    expect(sameBox(a, { ...a, top: 10.3 })).toBe(true);
    expect(sameBox(a, { ...a, top: 11 })).toBe(false);
    expect(sameBox(null, null)).toBe(true);
    expect(sameBox(a, null)).toBe(false);
  });
});

describe("a stop, planned before anything moves", () => {
  it("brings a tall element's top to the stage and lights only what shows, never under the bars", () => {
    // The atlas door: 361px tall, low on the page.
    const p = plan({ box: box(900, 361), scrollY: 0 });
    expect(p.place).toBe("bottom");
    expect(p.lit).not.toBeNull();
    const lit = p.lit!;
    expect(lit.top).toBeGreaterThanOrEqual(BAND.top);
    expect(lit.top + lit.height).toBeLessThanOrEqual(PHONE.height - FOOT.height - STAGE_GAP);
    expect(lit.top + lit.height).toBeLessThanOrEqual(BAND.bottom);
    // The page went down to it: its top now stands near the stage's top.
    expect(p.scrollTo).toBeGreaterThan(0);
    expect(900 - p.scrollTo).toBe(lit.top);
    expect(lit.top).toBeLessThan(BAND.top + 0.2 * (p.stage.bottom - p.stage.top));
  });

  it("lights the top of an element taller than the whole stage, and only that", () => {
    const p = plan({ box: box(900, 1200) });
    const lit = p.lit!;
    expect(lit.top + lit.height).toBe(p.stage.bottom);
    expect(lit.height).toBeLessThan(1200);
    expect(900 - p.scrollTo).toBe(lit.top);
  });

  it("leaves the page where it is when the element already stands in the stage's middle", () => {
    const p = plan({ box: box(220, 76), scrollY: 400 });
    expect(p.scrollTo).toBe(400);
    expect(p.lit).toEqual(box(220, 76));
  });

  it("cannot scroll past the page's ends, and lights what that leaves", () => {
    // At the page's end with no more room: it stays low, so only its top is lit.
    const end = plan({ box: box(600, 124), scrollY: 1463, maxScrollY: 1463 });
    expect(end.scrollTo).toBe(1463);
    // The words do better at the top there: all of it shows over the tab bar.
    expect(end.place).toBe("top");
    expect(end.lit).toEqual(box(600, 124));
    // With the room the tour gives after a page's end, the words stay at the foot.
    const room = plan({ box: box(600, 124), scrollY: 1463, maxScrollY: 1463 + FOOT.height });
    expect(room.place).toBe("bottom");
    expect(room.lit!.top + room.lit!.height).toBeLessThanOrEqual(PHONE.height - FOOT.height - STAGE_GAP);
    // Near the top of a page at its top: it cannot come lower, and needs not.
    const top = plan({ box: box(129, 76), scrollY: 0 });
    expect(top.scrollTo).toBe(0);
  });

  it("puts the words at the top over a thing held low on the screen, which no scroll can raise", () => {
    // The Bible's chapter pill, with Listen, at the foot over the tab bar.
    const p = plan({ box: box(690, 48, 60, 270), pinned: true, scrollY: 300, band: { top: 96, bottom: 761 } });
    expect(p.place).toBe("top");
    expect(p.scrollTo).toBe(300);
    expect(p.lit).toEqual(box(690, 48, 60, 270));
  });

  it("lights a thing held in its own bar: the bar that holds it is left out of the band by the caller", () => {
    // Today's magnifier in Today's bar, the band read without that bar.
    const p = plan({ box: box(4, 44, 300, 44), pinned: true, band: { top: 0, bottom: 761 } });
    expect(p.place).toBe("bottom");
    expect(p.lit).toEqual(box(4, 44, 300, 44));
  });

  it("never lights under the phone's own edges", () => {
    const p = plan({ box: box(20, 44, 300, 44), pinned: true, band: { top: 0, bottom: 761 }, insets: { top: 47, bottom: 34 } });
    expect(p.lit).toEqual(box(47, 17, 300, 44));
  });

  it("lights nothing when nothing of the element can show", () => {
    const p = plan({ box: box(900, 50), pinned: true, band: { top: 96, bottom: 761 } });
    expect(p.lit).toBeNull();
  });
});

describe("what takes a tap", () => {
  it("is everything round the lit box, and the box too unless the stop asks for a try", () => {
    const shut = tapBlockers(false);
    expect(shut.map((b) => b.name)).toEqual(["above", "below", "before", "after", "over"]);
    expect(tapBlockers(true).map((b) => b.name)).toEqual(["above", "below", "before", "after"]);
  });

  it("follows the light by its own variables, so nothing is drawn while it moves", () => {
    for (const b of tapBlockers(false)) {
      const values = Object.values(b.style).filter((v) => typeof v === "string").join(" ");
      expect(values, b.name).toMatch(/var\(--tour-[xywh], 0px\)/);
    }
    const below = tapBlockers(false).find((b) => b.name === "below")!;
    expect(below.style).toEqual({ top: "calc(var(--tour-y, 0px) + var(--tour-h, 0px))", left: 0, right: 0, bottom: 0 });
  });
});

describe("the move: the light and the page on the house curve", () => {
  it("is the house curve, cubic-bezier(0.22, 1, 0.36, 1): quick at first, settling slowly", () => {
    expect(houseEase(0)).toBe(0);
    expect(houseEase(1)).toBe(1);
    expect(houseEase(-1)).toBe(0);
    expect(houseEase(2)).toBe(1);
    let last = 0;
    for (let u = 0.05; u <= 1; u += 0.05) {
      const v = houseEase(u);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
    // Most of the way there in the first third.
    expect(houseEase(1 / 3)).toBeGreaterThan(0.75);
    // A straight line is a straight line.
    expect(cubicBezier(0.25, 0.25, 0.75, 0.75)(0.4)).toBeCloseTo(0.4, 4);
  });

  it("carries the light from one box to the next, and puts it out at its own middle", () => {
    expect(mixBox(box(0, 10, 0, 10), box(100, 30, 50, 30), 0.5)).toEqual({ top: 50, left: 25, width: 20, height: 20 });
    expect(closedAt(box(100, 40, 20, 60))).toEqual({ top: 120, left: 50, width: 0, height: 0 });
  });
});

describe("the wait: for the page, not for a clock", () => {
  const base: Looking = { onPage: true, sinceStart: 0, sinceArrived: 0, sinceChange: 0, framesSinceChange: 0, arriving: false };

  it("waits while the stop's page is still on its way, and gives up only when it never comes", () => {
    expect(lookVerdict({ ...base, onPage: false, sinceArrived: null, sinceStart: 4000 })).toBe("wait");
    expect(lookVerdict({ ...base, onPage: false, sinceArrived: null, sinceStart: ROUTE_WAIT_MS })).toBe("missing");
  });

  it("waits while the page is still changing, however long the element takes, up to the page's limit", () => {
    // The old rule passed a stop over 2.5 s after its page came; a page that
    // is still drawing its parts is waited for now.
    const drawing = { ...base, sinceStart: 6000, sinceArrived: 5000, sinceChange: 120, framesSinceChange: 3 };
    expect(lookVerdict(drawing)).toBe("wait");
    expect(lookVerdict({ ...drawing, sinceArrived: PAGE_WAIT_MS })).toBe("missing");
  });

  it("waits while a skeleton stands or the route is still leaving, even when nothing changes", () => {
    const still = { ...base, sinceArrived: 3000, sinceChange: 3000, framesSinceChange: 120 };
    expect(lookVerdict({ ...still, arriving: true })).toBe("wait");
    expect(lookVerdict(still)).toBe("missing");
  });

  it("passes a stop over once its page has settled without it: quiet for long enough, in frames drawn", () => {
    const settled = { ...base, sinceArrived: 1500, sinceChange: QUIET_MS, framesSinceChange: QUIET_FRAMES };
    expect(lookVerdict(settled)).toBe("missing");
    // One long task is not quiet: the time passed, but no frames were drawn.
    expect(lookVerdict({ ...settled, framesSinceChange: 1 })).toBe("wait");
    // Frames drawn, but the page changed a moment ago.
    expect(lookVerdict({ ...settled, sinceChange: QUIET_MS - 1 })).toBe("wait");
  });

  it("treats a stop with no page of its own as already there", () => {
    expect(lookVerdict({ ...base, sinceArrived: 0, sinceChange: 0, framesSinceChange: 0 })).toBe("wait");
    expect(lookVerdict({ ...base, sinceArrived: QUIET_MS, sinceChange: QUIET_MS, framesSinceChange: QUIET_FRAMES })).toBe("missing");
  });
});
