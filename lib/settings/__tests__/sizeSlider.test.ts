import { describe, expect, it } from "vitest";

import { stopAt, stopForKey, stopShare } from "../sizeSlider";

/**
 * Where a tap, a drag and a key land on Settings' reader size slider (1.8,
 * the owner's pick A of round 3: a verse of John over a slider with four
 * stops). How it is drawn is litPanels.test.ts.
 */
describe("the reader size slider", () => {
  // A track 300px long that starts 20px in, as a phone lays it out.
  const left = 20;
  const width = 300;

  it("lands a tap on the nearest of its four stops", () => {
    expect(stopAt(20, left, width, 4)).toBe(0);
    expect(stopAt(120, left, width, 4)).toBe(1);
    expect(stopAt(220, left, width, 4)).toBe(2);
    expect(stopAt(320, left, width, 4)).toBe(3);
    // Between two stops, the nearer one.
    expect(stopAt(20 + 40, left, width, 4)).toBe(0);
    expect(stopAt(20 + 60, left, width, 4)).toBe(1);
    expect(stopAt(20 + 260, left, width, 4)).toBe(3);
  });

  it("holds a drag past either end at that end", () => {
    expect(stopAt(-50, left, width, 4)).toBe(0);
    expect(stopAt(900, left, width, 4)).toBe(3);
  });

  it("runs the other way in a right-to-left language, smallest on the right", () => {
    expect(stopAt(320, left, width, 4, true)).toBe(0);
    expect(stopAt(20, left, width, 4, true)).toBe(3);
    expect(stopAt(120, left, width, 4, true)).toBe(2);
  });

  it("answers the first stop when there is no track to measure", () => {
    expect(stopAt(100, 0, 0, 4)).toBe(0);
    expect(stopAt(100, 0, Number.NaN, 4)).toBe(0);
    expect(stopAt(100, 0, 300, 1)).toBe(0);
  });

  it("moves a stop at a time with the arrows, and to an end with Home and End", () => {
    expect(stopForKey("ArrowRight", 1, 4)).toBe(2);
    expect(stopForKey("ArrowLeft", 1, 4)).toBe(0);
    expect(stopForKey("ArrowUp", 1, 4)).toBe(2);
    expect(stopForKey("ArrowDown", 1, 4)).toBe(0);
    expect(stopForKey("PageUp", 2, 4)).toBe(3);
    expect(stopForKey("PageDown", 2, 4)).toBe(1);
    expect(stopForKey("Home", 2, 4)).toBe(0);
    expect(stopForKey("End", 0, 4)).toBe(3);
  });

  it("stops at the ends rather than wrapping", () => {
    expect(stopForKey("ArrowRight", 3, 4)).toBe(3);
    expect(stopForKey("ArrowLeft", 0, 4)).toBe(0);
    expect(stopForKey("ArrowUp", 3, 4)).toBe(3);
    expect(stopForKey("ArrowDown", 0, 4)).toBe(0);
  });

  it("follows the track with Left and Right in a right-to-left language, while Up still grows the text", () => {
    expect(stopForKey("ArrowLeft", 1, 4, true)).toBe(2);
    expect(stopForKey("ArrowRight", 1, 4, true)).toBe(0);
    expect(stopForKey("ArrowUp", 1, 4, true)).toBe(2);
  });

  it("leaves every other key to the page", () => {
    expect(stopForKey("Tab", 1, 4)).toBeNull();
    expect(stopForKey("Enter", 1, 4)).toBeNull();
    expect(stopForKey("a", 1, 4)).toBeNull();
  });

  it("places each stop along the track, the first at its start and the last at its end", () => {
    expect([0, 1, 2, 3].map((i) => stopShare(i, 4))).toEqual([0, 1 / 3, 2 / 3, 1]);
    expect(stopShare(5, 4)).toBe(1);
    expect(stopShare(-1, 4)).toBe(0);
    expect(stopShare(0, 1)).toBe(0);
  });
});
