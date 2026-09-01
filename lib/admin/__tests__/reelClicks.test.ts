import { describe, expect, it } from "vitest";

import { clickGain, clickTimes, REEL_EASING } from "../reelClicks";

/**
 * These offsets are the sound's alignment with the picture, and nothing else
 * checks them. The animation is CSS and the clicks are scheduled on the audio
 * clock, so the two only agree because this maths says they do: get it wrong
 * and the ratchet drifts out of step with a reel nobody can measure by ear.
 */
describe("click timing", () => {
  const DUR = 900;
  const REST = 24;
  const times = clickTimes(REST, DUR);

  it("fires once per digit crossed", () => {
    expect(times).toHaveLength(REST);
  });

  it("never fires at zero, where every reel would clack at once", () => {
    expect(times[0]).toBeGreaterThan(0);
  });

  it("stays inside the spin", () => {
    for (const t of times) expect(t).toBeLessThanOrEqual(DUR + 0.001);
    // The last digit arrives as the animation ends, by definition. Tolerance
    // is a thousandth of a millisecond, not more: the solver is a forty step
    // binary search and lands about eight microseconds short, which is four
    // orders of magnitude below anything audible and two below the audio
    // clock's own resolution. Asserting exactness here would be pinning
    // float noise.
    expect(times[times.length - 1]).toBeCloseTo(DUR, 3);
  });

  it("only ever moves forward", () => {
    for (let i = 1; i < times.length; i++) {
      expect(times[i], `click ${i} went backwards`).toBeGreaterThan(times[i - 1]);
    }
  });

  it("spreads out as the reel brakes, which is the whole effect", () => {
    // A decelerating curve means later gaps are wider than earlier ones. Flat
    // gaps would be a metronome, not a wheel slowing down.
    const gap = (i: number) => times[i] - times[i - 1];
    expect(gap(times.length - 1)).toBeGreaterThan(gap(1) * 3);
  });

  it("front-loads the run, because the reel is fastest at the start", () => {
    // Half the clicks should be done well before half the time has passed.
    const half = times[Math.floor(times.length / 2)];
    expect(half).toBeLessThan(DUR / 2);
  });

  it("returns nothing for a reel that does not move", () => {
    expect(clickTimes(0, 900)).toEqual([]);
    expect(clickTimes(-1, 900)).toEqual([]);
    expect(clickTimes(24, 0)).toEqual([]);
    expect(clickTimes(Number.NaN, 900)).toEqual([]);
  });

  it("uses the same curve the CSS does", () => {
    // If Odometer.tsx's cubic-bezier changes and this does not, every click
    // lands at the wrong moment and nothing fails. Stated here so the pair is
    // at least written down in one place.
    expect(REEL_EASING).toEqual({ x1: 0.12, y1: 0.62, x2: 0.15, y2: 1 });
  });
});

describe("click gain", () => {
  it("softens as the reel brakes", () => {
    expect(clickGain(0, 24)).toBeGreaterThan(clickGain(23, 24));
  });

  it("never reaches silence or clips", () => {
    for (let i = 0; i < 24; i++) {
      const g = clickGain(i, 24);
      expect(g).toBeGreaterThan(0);
      expect(g).toBeLessThanOrEqual(1);
    }
  });

  it("handles a single click without dividing by zero", () => {
    expect(Number.isFinite(clickGain(0, 1))).toBe(true);
  });
});
