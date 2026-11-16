// The page moving itself to the reading is never the reader's scroll (build 98
// note 2, Updates 98g's walk). Listen's tap is a hand on the glass, and the
// page's glide to the paragraph being read came inside HAND_MS of it, so on an
// event the dock drew in the moment Listen was tapped. What a reader would
// notice if this broke: Listen tapped, and the dock they just met shrinks to
// the small pill and the tab bar leaves, though they have not read a line.
//
// Fails on the code before the mend: the glide counts as the reader's and the
// controls go ([true]).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { goToReadingPlace } from "@/lib/ui/readingPlace";
import { AWAY_AFTER_PX, HAND_MS, watchScrollAway } from "@/lib/ui/scrollAway";

type Listener = () => void;
let clock = 0;
let frames: FrameRequestCallback[] = [];
let listeners: Map<string, Set<Listener>>;
let win: {
  scrollY: number;
  innerHeight: number;
  scrollTo: (o: ScrollToOptions) => void;
  addEventListener: (t: string, f: Listener) => void;
  removeEventListener: (t: string, f: Listener) => void;
};

const fire = (type: string) => {
  for (const fn of [...(listeners.get(type) ?? [])]) fn();
};
const flush = () => {
  const due = frames;
  frames = [];
  for (const cb of due) cb(clock);
};
/** The page stands at `y` a frame later, as the browser moves it. */
const at = (y: number) => {
  clock += 16;
  win.scrollY = y;
  fire("scroll");
  flush();
};
/** Listen tapped: a finger down and up, as a reader taps. */
const tap = () => {
  fire("pointerdown");
  fire("touchstart");
};
const paragraphAt = (top: number) => ({ getBoundingClientRect: () => ({ top, bottom: top + 120, left: 0, right: 390, width: 390, height: 120 }) }) as unknown as Element;
const BAND = { top: 0, bottom: 760 };

beforeEach(() => {
  clock += 100_000;
  frames = [];
  listeners = new Map();
  win = {
    scrollY: 0,
    innerHeight: 844,
    scrollTo(o) {
      if (o.behavior !== "smooth") win.scrollY = o.top ?? 0;
    },
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type, fn) => {
      listeners.get(type)?.delete(fn);
    },
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {
    documentElement: { scrollHeight: 20000, dataset: {}, classList: { contains: () => false } },
    querySelector: () => null,
    querySelectorAll: () => [],
  });
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.spyOn(performance, "now").mockImplementation(() => clock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Listen tapped, and the page moving itself to the paragraph being read", () => {
  it("leaves the dock at rest through the page's glide, inside HAND_MS of the tap", () => {
    const seen: boolean[] = [];
    const stop = watchScrollAway((away) => seen.push(away));
    const tappedAt = clock;
    tap();
    clock += 300; // the voice begins and the follow lights the first paragraph, low on the screen
    const top = goToReadingPlace(paragraphAt(1400), { band: BAND }) ?? 0;
    expect(top).toBeGreaterThan(AWAY_AFTER_PX * 4);
    for (let i = 1; i <= 20; i++) at(Math.round((top * i) / 20));
    expect(clock - tappedAt).toBeLessThan(HAND_MS);
    expect(seen).toEqual([]);
    stop();
  });

  it("and through a move made at once, as with Purify's motion off", () => {
    const seen: boolean[] = [];
    const stop = watchScrollAway((away) => seen.push(away));
    tap();
    clock += 300;
    goToReadingPlace(paragraphAt(1400), { band: BAND, smooth: false });
    at(win.scrollY);
    expect(seen).toEqual([]);
    stop();
  });

  it("until the reader reads on: their own scroll down then draws it in", () => {
    const seen: boolean[] = [];
    const stop = watchScrollAway((away) => seen.push(away));
    tap();
    clock += 300;
    const top = goToReadingPlace(paragraphAt(1400), { band: BAND }) ?? 0;
    for (let i = 1; i <= 20; i++) at(Math.round((top * i) / 20));
    clock += 2000;
    fire("touchmove");
    at(top + AWAY_AFTER_PX + 6);
    expect(seen).toEqual([true]);
    stop();
  });

  it("and the page following the reading again, while the dock is drawn in, leaves it drawn in", () => {
    const seen: boolean[] = [];
    const stop = watchScrollAway((away) => seen.push(away));
    win.scrollY = 1000;
    fire("touchmove");
    at(1000 + AWAY_AFTER_PX + 6);
    expect(seen).toEqual([true]);
    clock += 200; // inside HAND_MS of the thumb, the page goes up to the paragraph being read
    const top = goToReadingPlace(paragraphAt(-400), { band: BAND, smooth: false }) ?? 0;
    expect(top).toBeLessThan(1000);
    at(top);
    expect(seen).toEqual([true]);
    stop();
  });
});
