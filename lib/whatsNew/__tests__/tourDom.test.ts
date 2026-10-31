// The tour on the page: the lit hole, where a step's words stand, and what
// takes a tap around the hole (lib/whatsNew/tourDom.ts). Pure arithmetic; the
// measuring itself is walked on a device.

import { describe, expect, it } from "vitest";

import {
  CAPTION_GAP,
  HOLE_EDGE,
  HOLE_PAD,
  blockersAround,
  captionPlace,
  holeAround,
  normalizePath,
  sameHole,
  samePage,
  type Hole,
} from "../tourDom";

const PHONE = { width: 390, height: 844 };
const EDGES = { top: 47, bottom: 34 };

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

describe("the hole", () => {
  it("leaves room round the element, with the element's own corners and the pad", () => {
    const hole = holeAround({ top: 300, left: 20, width: 350, height: 60 }, 21, PHONE)!;
    expect(hole).toEqual({ top: 300 - HOLE_PAD, left: 20 - HOLE_PAD, width: 350 + 2 * HOLE_PAD, height: 60 + 2 * HOLE_PAD, radius: 21 + HOLE_PAD });
  });

  it("stays inside the window, and its corners never round past half its side", () => {
    const hole = holeAround({ top: -40, left: 0, width: 390, height: 100 }, 999, PHONE)!;
    expect(hole.top).toBe(HOLE_EDGE);
    expect(hole.left).toBe(HOLE_EDGE);
    expect(hole.left + hole.width).toBe(PHONE.width - HOLE_EDGE);
    expect(hole.radius).toBeLessThanOrEqual(Math.min(hole.width, hole.height) / 2);
  });

  it("is none when nothing of the element is on screen", () => {
    expect(holeAround({ top: 900, left: 0, width: 100, height: 40 }, 0, PHONE)).toBeNull();
    expect(holeAround({ top: -200, left: 0, width: 100, height: 40 }, 0, PHONE)).toBeNull();
  });

  it("is the same to the eye within half a pixel", () => {
    const a: Hole = { top: 10, left: 10, width: 100, height: 50, radius: 12 };
    expect(sameHole(a, { ...a, top: 10.3 })).toBe(true);
    expect(sameHole(a, { ...a, top: 11 })).toBe(false);
    expect(sameHole(null, null)).toBe(true);
    expect(sameHole(a, null)).toBe(false);
  });
});

describe("where a step's words stand", () => {
  const at = (top: number, height: number): Hole => ({ top, left: 12, width: 366, height, radius: 20 });

  it("under the hole when they fit there, nearer the thumb", () => {
    expect(captionPlace(at(200, 80), 196, PHONE, EDGES)).toBe("bottom");
  });

  it("over the hole when it is low: the mini player at the foot", () => {
    expect(captionPlace(at(PHONE.height - 34 - 86 - 56 - 8, 72), 196, PHONE, EDGES)).toBe("top");
  });

  it("on the roomier side when they fit on neither", () => {
    expect(captionPlace(at(250, 500), 196, PHONE, EDGES)).toBe("top");
    expect(captionPlace(at(120, 560), 196, PHONE, EDGES)).toBe("bottom");
  });

  it("at the foot when nothing is lit", () => {
    expect(captionPlace(null, 196, PHONE, EDGES)).toBe("bottom");
  });

  it("counts the phone's own edges and the gaps", () => {
    // Exactly room for it under the hole.
    const bottom = PHONE.height - EDGES.bottom - 2 * CAPTION_GAP - 196;
    expect(captionPlace(at(bottom - 100, 100), 196, PHONE, EDGES)).toBe("bottom");
    expect(captionPlace(at(bottom - 99, 100), 196, PHONE, EDGES)).toBe("top");
  });
});

describe("what takes a tap", () => {
  const hole: Hole = { top: 300, left: 20, width: 200, height: 80, radius: 20 };

  it("is all of the page while nothing is lit", () => {
    expect(blockersAround(null, PHONE, false)).toEqual([{ top: 0, left: 0, width: 390, height: 844 }]);
  });

  it("is everything round the hole, and the hole too, unless the step asks for a try", () => {
    const parts = blockersAround(hole, PHONE, false);
    expect(parts).toContainEqual({ top: 0, left: 0, width: 390, height: 300 });
    expect(parts).toContainEqual({ top: 380, left: 0, width: 390, height: 464 });
    expect(parts).toContainEqual({ top: 300, left: 0, width: 20, height: 80 });
    expect(parts).toContainEqual({ top: 300, left: 220, width: 170, height: 80 });
    expect(parts).toContainEqual({ top: 300, left: 20, width: 200, height: 80 });
    const area = parts.reduce((sum, p) => sum + p.width * p.height, 0);
    expect(area).toBe(390 * 844);
    // A try: the hole is left open to the finger, and nothing else is.
    const open = blockersAround(hole, PHONE, true);
    expect(open).not.toContainEqual({ top: 300, left: 20, width: 200, height: 80 });
    expect(open.reduce((sum, p) => sum + p.width * p.height, 0)).toBe(390 * 844 - 200 * 80);
  });

  it("drops the empty parts at the window's edges", () => {
    const parts = blockersAround({ top: 0, left: 0, width: 390, height: 100, radius: 0 }, PHONE, true);
    expect(parts).toEqual([{ top: 100, left: 0, width: 390, height: 744 }]);
  });
});
