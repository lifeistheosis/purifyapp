// The Bible reader's controls step away while the reader reads on and come
// back when they scroll up (1.8, the owner's pick B of round 2, "The page":
// "The floating pill comes back when you scroll up, with Listen").
//
// What a reader would notice if this broke: the pill and the round buttons
// flickering in and out on a small wobble of the thumb, staying away at the
// top of the chapter, hiding as the page lands on a verse it was sent to,
// coming back over the last lines of a chapter as they are read, or never
// coming back.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AWAY_AFTER_PX,
  BACK_AFTER_PX,
  FOOT_SETTLE_MS,
  TOP_PX,
  noteFootMoved,
  stepAway,
  watchScrollAway,
  type Away,
} from "@/lib/ui/scrollAway";

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

// The mini player steps aside by the same rule (1.8, the owner's pick B of
// r3-05): drawn in, it gives 16px of the page's foot back, and at the very
// end of a page the browser then moves the page back to its new end. That
// move happens while the reader's thumb is still on the glass, so it read as
// a scroll up: the card came straight back, drew in again on the next run
// down, and the Bible's own controls came back with it.
describe("the page's foot moving", () => {
  type Listener = () => void;
  let clock = 0;
  let frames: FrameRequestCallback[] = [];
  let listeners: Map<string, Set<Listener>>;
  let win: { scrollY: number; addEventListener: (t: string, f: Listener) => void; removeEventListener: (t: string, f: Listener) => void };

  const fire = (type: string) => {
    for (const fn of [...(listeners.get(type) ?? [])]) fn();
  };
  const flush = () => {
    const due = frames;
    frames = [];
    for (const cb of due) cb(clock);
  };
  /** The reader's thumb moves the page to `y`. */
  const byHand = (y: number) => {
    fire("touchmove");
    win.scrollY = y;
    fire("scroll");
    flush();
  };
  /** The page moves to `y` with no new touch, as the browser moves it. */
  const byItself = (y: number) => {
    win.scrollY = y;
    fire("scroll");
    flush();
  };

  beforeEach(() => {
    clock += 100_000;
    frames = [];
    listeners = new Map();
    win = {
      scrollY: 1000,
      addEventListener: (type, fn) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener: (type, fn) => {
        listeners.get(type)?.delete(fn);
      },
    };
    (globalThis as { window?: unknown }).window = win;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    vi.spyOn(performance, "now").mockImplementation(() => clock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (globalThis as { window?: unknown }).window;
  });

  it("is what brought the card back at a page's end, with nothing said", () => {
    const seen: boolean[] = [];
    const stop = watchScrollAway((away) => seen.push(away));
    byHand(1000 + AWAY_AFTER_PX + 6);
    expect(seen).toEqual([true]);
    // 16px given back, a moment later, the thumb still down.
    clock += 30;
    byItself(1000 + AWAY_AFTER_PX + 6 - 16);
    expect(seen).toEqual([true, false]);
    stop();
  });

  it("is the page's own once it is said, so the card stays drawn in", () => {
    const seen: boolean[] = [];
    const stop = watchScrollAway((away) => seen.push(away));
    byHand(1030);
    expect(seen).toEqual([true]);
    noteFootMoved();
    clock += 30;
    byItself(1014);
    expect(seen).toEqual([true]);
    stop();
  });

  it("and the reader's own scroll up after it still brings it back", () => {
    const seen: boolean[] = [];
    const stop = watchScrollAway((away) => seen.push(away));
    byHand(1030);
    noteFootMoved();
    clock += 30;
    byItself(1014);
    clock += FOOT_SETTLE_MS;
    byHand(1014 - BACK_AFTER_PX);
    expect(seen).toEqual([true, false]);
    stop();
  });

  it("never keeps it away at the top of the page", () => {
    const seen: boolean[] = [];
    const stop = watchScrollAway((away) => seen.push(away));
    byHand(1030);
    noteFootMoved();
    byItself(TOP_PX);
    expect(seen).toEqual([true, false]);
    stop();
  });
});
