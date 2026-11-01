import { describe, expect, it } from "vitest";

import {
  TRAY_CARET_INSET,
  TRAY_EDGE,
  TRAY_GAP,
  answered,
  applyResponse,
  countsOf,
  parseResponseMap,
  toggleMine,
  trayPlace,
} from "../responses";

describe("responses", () => {
  const counts = { amen: 2, praying: 0, glory: 1 };

  it("moves only the response tapped, and only when it changes", () => {
    expect(applyResponse(counts, [], "praying", true)).toEqual({ amen: 2, praying: 1, glory: 1 });
    expect(applyResponse(counts, ["amen"], "amen", false)).toEqual({ amen: 1, praying: 0, glory: 1 });
    // Already held: turning it on again changes nothing.
    expect(applyResponse(counts, ["amen"], "amen", true)).toBe(counts);
  });

  it("never goes below zero", () => {
    expect(applyResponse({ amen: 0, praying: 0, glory: 0 }, ["amen"], "amen", false).amen).toBe(0);
  });

  it("keeps a reader's own responses in a fixed order", () => {
    expect(toggleMine(["glory"], "amen", true)).toEqual(["amen", "glory"]);
    expect(toggleMine(["amen", "glory"], "amen", false)).toEqual(["glory"]);
  });

  it("reads totals off a row from any server", () => {
    expect(countsOf({ amen_count: 3, praying_count: null })).toEqual({ amen: 3, praying: 0, glory: 0 });
  });

  it("narrows the wire, dropping anything that is not a response", () => {
    expect(parseResponseMap({ a: ["amen", "wow", "glory"], b: "amen", c: [] })).toEqual({ a: ["amen", "glory"] });
    expect(parseResponseMap(null)).toEqual({});
  });

  it("lights the candle once the reader has given any of the three", () => {
    expect(answered([])).toBe(false);
    expect(answered(["glory"])).toBe(true);
    expect(answered(["amen", "praying", "glory"])).toBe(true);
  });
});

// The tray over the row (1.8, the owner's pick of r3-30, A; note 80 of build
// 86). A phone 390 wide, the band under the bar and over the tab bar, a post's
// candle 44 by 36 and a tray 290 by 50, as r3-30 draws them.
describe("the tray's place", () => {
  const screen = { width: 390, top: 60, bottom: 760 };
  const tray = { width: 290, height: 50 };
  const candleAt = (left: number, top = 600) => ({ left, top, width: 44, height: 36 });
  const middle = (c: { left: number; width: number }) => c.left + c.width / 2;

  it("stands over the row, centred on the candle, its caret on the candle's middle", () => {
    const candle = candleAt(167);
    const p = trayPlace(candle, tray, screen, TRAY_GAP.post);
    expect(p).toEqual({ left: 44, top: 539, caret: 145, below: false });
    // Its foot is the gap above the row: nothing under the row makes room for it.
    expect(p.top + tray.height).toBe(candle.top - TRAY_GAP.post);
    expect(p.left + p.caret).toBe(middle(candle));
  });

  it("stays inside the screen's sides, and the caret still finds the candle", () => {
    const right = candleAt(330);
    const r = trayPlace(right, tray, screen, TRAY_GAP.post);
    expect(r.left + tray.width).toBe(screen.width - TRAY_EDGE);
    expect(r.left + r.caret).toBe(middle(right));

    const left = candleAt(40);
    const l = trayPlace(left, tray, screen, TRAY_GAP.post);
    expect(l.left).toBe(TRAY_EDGE);
    expect(l.left + l.caret).toBe(middle(left));
  });

  it("keeps the caret clear of the round corners", () => {
    const p = trayPlace(candleAt(-10), tray, screen, TRAY_GAP.post);
    expect(p.left).toBe(TRAY_EDGE);
    expect(p.caret).toBe(TRAY_CARET_INSET);
    const q = trayPlace(candleAt(380), tray, screen, TRAY_GAP.post);
    expect(q.caret).toBe(tray.width - TRAY_CARET_INSET);
  });

  it("starts at the near edge when the words run wider than the screen allows", () => {
    const p = trayPlace(candleAt(167), { width: 380, height: 58 }, screen, TRAY_GAP.post);
    expect(p.left).toBe(TRAY_EDGE);
  });

  it("stands under the row when a bar covers the room over it, and over it otherwise", () => {
    const high = candleAt(167, 80);
    const p = trayPlace(high, tray, screen, TRAY_GAP.post);
    expect(p.below).toBe(true);
    expect(p.top).toBe(high.top + high.height + TRAY_GAP.post);
    // No room under it either (a phone on its side, every bar up): over it after all.
    const cramped = trayPlace(high, tray, { width: 390, top: 60, bottom: 160 }, TRAY_GAP.post);
    expect(cramped.below).toBe(false);
    expect(cramped.top).toBe(high.top - TRAY_GAP.post - tray.height);
  });

  it("stands a little closer over a reply, whose tray is one size smaller", () => {
    expect(TRAY_GAP.reply).toBeLessThan(TRAY_GAP.post);
    const candle = { left: 120, top: 640, width: 44, height: 28 };
    const p = trayPlace(candle, { width: 250, height: 42 }, screen, TRAY_GAP.reply);
    expect(p.top + 42).toBe(candle.top - TRAY_GAP.reply);
  });
});
