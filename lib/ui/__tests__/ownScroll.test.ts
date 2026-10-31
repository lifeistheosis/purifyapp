// Which scrolls are the reader's own (1.8, the owner's note 68: the Bible
// keeps the verse a reader stopped at). Only those may move the place; the
// jump to the top that comes with leaving a chapter, and the glide to a verse
// a link lands on, may not. The rule is in ../ownScroll.ts.

import { describe, expect, it } from "vitest";

import {
  FLING_GAP_MS,
  IDLE_HAND,
  KEY_MS,
  WHEEL_MS,
  handAfter,
  scrollBy,
  scrollsPage,
  type Hand,
  type HandEvent,
} from "../ownScroll";

/** Plays what the hand and the page did, and answers which scrolls were the reader's. */
function play(steps: (HandEvent | { type: "scroll"; at: number })[]): boolean[] {
  let hand: Hand = IDLE_HAND;
  const own: boolean[] = [];
  for (const step of steps) {
    if (step.type === "scroll") {
      const next = scrollBy(hand, step.at);
      hand = next.hand;
      own.push(next.own);
    } else {
      hand = handAfter(hand, step);
    }
  }
  return own;
}

const scroll = (at: number) => ({ type: "scroll" as const, at });

describe("a finger on the glass", () => {
  it("moves the place while it drags the page, and through the fling it lets go into", () => {
    const own = play([
      { type: "touchstart" },
      scroll(1000),
      scroll(1016),
      scroll(1032),
      { type: "touchend" },
      // The fling, a frame apart.
      scroll(1048),
      scroll(1064),
      scroll(1180),
    ]);
    expect(own).toEqual([true, true, true, true, true, true]);
  });

  it("stops being the reader's when the fling has stopped", () => {
    const own = play([{ type: "touchstart" }, scroll(1000), { type: "touchend" }, scroll(1016), scroll(1016 + FLING_GAP_MS + 1), scroll(1016 + FLING_GAP_MS + 20)]);
    expect(own).toEqual([true, true, false, false]);
  });

  it("never moves it with the jump to the top that comes with leaving by a tap", () => {
    // Read down by hand, the fling settles, then a tap on Today, the Bible
    // tab or the way back, and the page jumps as the next screen comes.
    const own = play([
      { type: "touchstart" },
      scroll(1000),
      { type: "touchend" },
      scroll(1016),
      { type: "touchstart" },
      { type: "touchend" },
      scroll(4000),
      scroll(4001),
    ]);
    expect(own).toEqual([true, true, false, false]);
  });

  it("leaves a tap that moved nothing out, even straight after a fling", () => {
    // A tap stops a fling on the glass: what moves after it is not the fling.
    const own = play([{ type: "touchstart" }, scroll(1000), { type: "touchend" }, scroll(1010), { type: "touchstart" }, { type: "touchend" }, scroll(1030)]);
    expect(own).toEqual([true, true, false]);
  });

  it("does not count a pull that moved nothing as a fling", () => {
    const own = play([{ type: "touchstart" }, { type: "touchend" }, scroll(10)]);
    expect(own).toEqual([false]);
  });
});

describe("the page moving by itself", () => {
  it("is never the reader's: a verse landed on, a place given back, the reading kept in view", () => {
    expect(play([scroll(100), scroll(116), scroll(132), scroll(5000)])).toEqual([false, false, false, false]);
  });
});

describe("a wheel, a key and the scroll bar", () => {
  it("count for the moment their glide takes, and not after", () => {
    expect(play([{ type: "wheel", at: 1000 }, scroll(1010), scroll(1000 + WHEEL_MS), scroll(1000 + WHEEL_MS + 1)])).toEqual([true, true, false]);
    expect(play([{ type: "key", at: 1000 }, scroll(1100), scroll(1000 + KEY_MS), scroll(1000 + KEY_MS + 1)])).toEqual([true, true, false]);
    expect(play([{ type: "bar", held: true }, scroll(1), scroll(9000), { type: "bar", held: false }, scroll(9001)])).toEqual([true, true, false]);
  });

  it("knows a key that scrolls from one that types or presses", () => {
    for (const key of ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "]) {
      expect(scrollsPage(key, { tagName: "BODY" }), key).toBe(true);
    }
    // The computer's arrows to the side turn the chapter (ChapterKeyNav): no scroll.
    expect(scrollsPage("ArrowRight", { tagName: "BODY" })).toBe(false);
    expect(scrollsPage("ArrowDown", { tagName: "INPUT" })).toBe(false);
    expect(scrollsPage("ArrowDown", { tagName: "TEXTAREA" })).toBe(false);
    expect(scrollsPage("ArrowDown", { tagName: "DIV", isContentEditable: true })).toBe(false);
    expect(scrollsPage(" ", { tagName: "BUTTON" })).toBe(false);
    expect(scrollsPage(" ", { tagName: "A" })).toBe(false);
    expect(scrollsPage("PageDown", { tagName: "BUTTON" })).toBe(true);
  });
});
