// The Bible reader's controls step away while the reader reads on and come
// back when they scroll up (1.8, the owner's pick B of round 2, "The page":
// "The floating pill comes back when you scroll up, with Listen").
//
// What a reader would notice if this broke: the pill and the round buttons
// flickering in and out on a small wobble of the thumb, staying away at the
// top of the chapter, hiding as the page lands on a verse it was sent to,
// coming back over the last lines of a chapter as they are read, or never
// coming back.

import { describe, expect, it } from "vitest";

import { AWAY_AFTER_PX, BACK_AFTER_PX, TOP_PX, stepAway, type Away } from "@/lib/ui/scrollAway";

const SHOWN: Away = { away: false, run: 0, y: 1000 };

/** Scrolls through each place in turn, from `from`, by hand unless told. */
function scroll(from: Away, places: number[], byHand = true): Away {
  return places.reduce((s, y) => stepAway(s, y, byHand), from);
}

describe("reading on", () => {
  it("puts the controls away after a run down, and not on a wobble", () => {
    expect(scroll(SHOWN, [1005, 1010]).away).toBe(false);
    expect(scroll(SHOWN, [1010, 1020, 1000 + AWAY_AFTER_PX]).away).toBe(true);
    // Up and down by a few pixels, as a thumb resting on the glass does.
    expect(scroll(SHOWN, [1008, 1002, 1009, 1003, 1010, 1004]).away).toBe(false);
  });

  it("brings them back after a shorter run up", () => {
    const away = scroll(SHOWN, [1100]);
    expect(away.away).toBe(true);
    expect(BACK_AFTER_PX).toBeLessThan(AWAY_AFTER_PX);
    expect(scroll(away, [1096]).away).toBe(true);
    expect(scroll(away, [1100 - BACK_AFTER_PX]).away).toBe(false);
  });

  it("starts the run again when the reader turns", () => {
    // Down 20, up 4, down 20: neither run reaches the line on its own.
    expect(scroll(SHOWN, [1020, 1016, 1036]).away).toBe(false);
  });

  it("leaves them away to the chapter's foot, over which they would lie", () => {
    expect(scroll(SHOWN, [3000, 6000, 9000]).away).toBe(true);
  });
});

describe("the top of the chapter", () => {
  it("always shows the controls, by hand or not", () => {
    const away = scroll(SHOWN, [1200]);
    expect(away.away).toBe(true);
    expect(scroll(away, [TOP_PX]).away).toBe(false);
    expect(stepAway(away, 0, false).away).toBe(false);
  });

  it("and so does a chapter shorter than the screen", () => {
    expect(stepAway(SHOWN, 40, true).away).toBe(false);
  });
});

describe("a scroll the page makes by itself", () => {
  it("leaves the controls as they were", () => {
    // A verse landed on from a link, or the reading kept in view.
    expect(scroll(SHOWN, [2400], false).away).toBe(false);
    const away = scroll(SHOWN, [1200]);
    expect(scroll(away, [800], false).away).toBe(true);
  });

  it("and the reader's next run starts from where the page went", () => {
    const jumped = scroll(SHOWN, [2400], false);
    expect(jumped.y).toBe(2400);
    expect(jumped.run).toBe(0);
    expect(scroll(jumped, [2400 + AWAY_AFTER_PX]).away).toBe(true);
  });
});
