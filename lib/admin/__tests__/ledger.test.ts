import { describe, expect, it } from "vitest";

import {
  nearestIndex,
  pathLength,
  polyline,
  project,
  sharedDomain,
  yTicks,
} from "../ledger/sparkline";
import { easeOut, joinNumeric, splitNumeric, valueAt } from "../ledger/countUp";
import { deltaText, deltaTone } from "../ledger/delta";
import {
  DEFAULT_PINS,
  parsePins,
  parseStarted,
  STARTED_ITEMS,
  startedComplete,
  togglePin,
} from "../ledger/pins";

describe("sparkline path", () => {
  it("projects a series across the full width and inside the pad", () => {
    const pts = project([1, 3, 2], { width: 100, height: 36, pad: 2 });
    expect(pts.map((p) => p.x)).toEqual([0, 50, 100]);
    // Max sits at the top pad, min at the bottom pad.
    expect(pts[1].y).toBe(2);
    expect(pts[0].y).toBe(34);
  });

  it("draws a flat series through the middle rather than dividing by zero", () => {
    const pts = project([5, 5, 5], { width: 90, height: 20, pad: 0 });
    expect(pts.every((p) => p.y === 10)).toBe(true);
    expect(pts.every((p) => Number.isFinite(p.y))).toBe(true);
  });

  it("writes a polyline, not a curve, so the length is exact", () => {
    const pts = project([0, 10], { width: 30, height: 40, pad: 0 });
    expect(polyline(pts)).toBe("M 0 40 L 30 0");
    expect(pathLength(pts)).toBe(50);
  });

  it("returns an empty path for an empty series", () => {
    expect(polyline([])).toBe("");
    expect(pathLength([])).toBe(0);
    expect(project([], { width: 10, height: 10 })).toEqual([]);
  });

  it("puts a compare series on the same scale as the main one", () => {
    const d = sharedDomain([2, 4], [1, 9], undefined);
    expect(d).toEqual({ min: 1, max: 9 });
    const main = project([2, 4], { width: 10, height: 10, pad: 0 }, d);
    // 4 on a 1..9 domain is 3/8 of the way up.
    expect(main[1].y).toBeCloseTo(10 - (3 / 8) * 10, 5);
  });

  it("gives two ticks on a short chart and three on a tall one", () => {
    expect(yTicks({ min: 0, max: 100 }, 160)).toEqual([0, 100]);
    expect(yTicks({ min: 0, max: 100 }, 220)).toEqual([0, 50, 100]);
    expect(yTicks({ min: 7, max: 7 }, 220)).toEqual([7]);
  });

  it("snaps a cursor to the nearest point and clamps at the ends", () => {
    expect(nearestIndex(0, 100, 5)).toBe(0);
    expect(nearestIndex(26, 100, 5)).toBe(1);
    expect(nearestIndex(500, 100, 5)).toBe(4);
    expect(nearestIndex(-40, 100, 5)).toBe(0);
    expect(nearestIndex(50, 100, 1)).toBe(0);
  });
});

describe("count up", () => {
  it("splits a money string into prefix, number and suffix", () => {
    expect(splitNumeric("$1,204.50")).toEqual({
      prefix: "$",
      value: 1204.5,
      decimals: 2,
      suffix: "",
      grouped: true,
    });
    expect(splitNumeric("3.2%")).toMatchObject({ value: 3.2, decimals: 1, suffix: "%" });
    expect(splitNumeric("84 / 120")).toMatchObject({ value: 84, suffix: " / 120" });
  });

  it("returns null for text with no number in it", () => {
    expect(splitNumeric("Not recorded")).toBeNull();
    expect(splitNumeric("—")).toBeNull();
  });

  it("rebuilds the string at an intermediate value with the same shape", () => {
    const s = splitNumeric("$1,204.50")!;
    expect(joinNumeric(s, 0)).toBe("$0.00");
    expect(joinNumeric(s, 602.25)).toBe("$602.25");
    expect(joinNumeric(s, 1204.5)).toBe("$1,204.50");
  });

  it("writes a negative with a true minus", () => {
    const s = splitNumeric("−12")!;
    expect(s.value).toBe(-12);
    expect(joinNumeric(s, -12)).toBe("−12");
    expect(joinNumeric(s, 0)).toBe("0");
  });

  it("eases out: fast at first, settled at the end", () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
    expect(valueAt(400, 1)).toBe(400);
    expect(valueAt(400, 0)).toBe(0);
  });
});

describe("delta", () => {
  it("colours by direction only and writes a true minus", () => {
    expect(deltaTone({ value: 4.2 })).toBe("up");
    expect(deltaTone({ value: -4.2 })).toBe("down");
    expect(deltaTone({ value: 0 })).toBe("flat");
    expect(deltaText({ value: 4.25 })).toBe("+4.3%");
    expect(deltaText({ value: -4.25 })).toBe("−4.3%");
    expect(deltaText({ value: 0 })).toBe("0%");
    expect(deltaText({ value: -12, suffix: "" })).toBe("−12");
  });

  it("flips the colour, not the sign, for a metric where down is good", () => {
    expect(deltaTone({ value: -3, invert: true })).toBe("up");
    expect(deltaText({ value: -3, invert: true })).toBe("−3.0%");
  });
});

describe("pins", () => {
  const known = [...DEFAULT_PINS, "extra"];

  it("defaults when nothing is stored or the store is malformed", () => {
    expect(parsePins(null, known)).toEqual([...DEFAULT_PINS]);
    expect(parsePins("not json", known)).toEqual([...DEFAULT_PINS]);
    expect(parsePins('{"a":1}', known)).toEqual([...DEFAULT_PINS]);
  });

  it("drops ids that no longer exist and keeps order", () => {
    expect(parsePins('["mrr","gone","extra"]', known)).toEqual(["mrr", "extra"]);
  });

  it("toggles without duplicating", () => {
    expect(togglePin(["a"], "b")).toEqual(["a", "b"]);
    expect(togglePin(["a", "b"], "a")).toEqual(["b"]);
  });

  it("the getting started card completes only when all five are done", () => {
    expect(STARTED_ITEMS).toHaveLength(5);
    expect(startedComplete(parseStarted(null))).toBe(false);
    const all = JSON.stringify(STARTED_ITEMS.map((i) => i.id));
    expect(startedComplete(parseStarted(all))).toBe(true);
    expect(startedComplete(parseStarted("broken"))).toBe(false);
  });
});
