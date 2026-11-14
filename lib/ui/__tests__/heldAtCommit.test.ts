// The page holds what the finger pressed in the commit that changes it
// (1.9, Gate 2's fourth fault, 2026-11-14).
//
// /plans/acts/, Mark day 1 as read: the card over the days turns to the next
// day and the line of days in a row comes over them. The page means to hold
// the circle itself (lib/ui/useHeldPlace.ts), and it did, but only in the
// next frame's callback, after whatever else that frame asked first. With the
// browser's scroll anchoring off, as WebKit (the iPhone, the iPad) has none,
// the gate's walk, following the circle frame by frame, found it 41px from
// the finger in that frame, for every one of days 1 to 5. The prayer book
// answers in the commit, before paint (components/prayers/PrayerBookContents
// .tsx), and passed the same walk.
//
// This runs the hook with a stubbed window and a stand-in for React's hooks,
// so a commit can be made to happen before any frame: after a tap, the page's
// next commit puts the pressed thing back where it was, with no frame drawn.
//
// What a reader would notice if this broke: on an iPhone, the day just
// marked jumps away from the finger as the page changes over it.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const layoutEffects: (() => void)[] = [];
vi.mock("react", () => ({
  useRef: <T,>(current: T) => ({ current }),
  useCallback: <T,>(fn: T) => fn,
  useEffect: () => {},
  useLayoutEffect: (fn: () => void) => {
    layoutEffects.push(fn);
  },
}));

type Win = {
  scrollY: number;
  innerHeight: number;
  scrollTo: (o: { top: number }) => void;
  addEventListener: () => void;
  removeEventListener: () => void;
};

let frames: FrameRequestCallback[] = [];
let scrolls: number[] = [];
let win: Win;

beforeEach(() => {
  layoutEffects.length = 0;
  frames = [];
  scrolls = [];
  win = {
    scrollY: 300,
    innerHeight: 844,
    scrollTo: ({ top }) => {
      scrolls.push(top);
      win.scrollY = top;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", { documentElement: { scrollHeight: 4000 } });
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A circle on the screen, at `top`, until the page changes over it. */
function circle(top: number) {
  const el = { isConnected: true, top, getBoundingClientRect: () => ({ top: el.top - (win.scrollY - 300) }) };
  return el;
}

/** The page's commit: every layout effect of the page that holds, as React runs them after the change is in the page. */
const commit = () => layoutEffects.forEach((fn) => fn());

describe("the page holds what the finger pressed in the commit that changes it", () => {
  it("a mark that brings a line over the days: the circle is back under the finger before any frame", async () => {
    const { useHeldPlace } = await import("@/lib/ui/useHeldPlace");
    const hold = useHeldPlace();
    const day = circle(527.5);
    hold(day as unknown as Element);
    // The mark is made: the line of days in a row comes over the days, and the circle stands 41px lower in the page.
    day.top += 41;
    commit();
    expect(frames.length, "no frame has been drawn yet").toBeGreaterThan(0);
    expect(scrolls, "the page went up by the line in the commit").toEqual([341]);
    expect(day.getBoundingClientRect().top).toBe(527.5);
  });

  it("asks nothing of a commit when nothing is held, or once the hold has let go", async () => {
    const { useHeldPlace } = await import("@/lib/ui/useHeldPlace");
    const hold = useHeldPlace();
    commit();
    expect(scrolls).toEqual([]);
    const day = circle(400);
    hold(day as unknown as Element);
    // The row was drawn anew: the hold lets go, and a later commit asks nothing.
    day.isConnected = false;
    commit();
    day.isConnected = true;
    day.top += 41;
    commit();
    expect(scrolls).toEqual([]);
  });

  it("each frame after it still answers what the page gains later", async () => {
    const { useHeldPlace } = await import("@/lib/ui/useHeldPlace");
    const hold = useHeldPlace();
    const day = circle(527.5);
    hold(day as unknown as Element);
    day.top += 41;
    commit();
    // The part over the days rounds itself to a whole pixel after the commit (useNoShrink): the frame answers it.
    day.top += 0.6;
    frames.shift()?.(0);
    expect(scrolls).toEqual([341, 341.6]);
  });
});
