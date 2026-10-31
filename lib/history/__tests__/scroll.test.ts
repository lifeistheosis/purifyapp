// The timeline's place, put back on Back and offered on a fresh visit (the
// owner's note 66 of build 80: "when you're on Discover section and then you
// click the historical timeline ... there's like a frame where it bugs in").
//
// Filmed on the native export before this: opened from Discover, the
// timeline was drawn at its top, grew a "Continue at" row a moment later and
// then jumped to the last visit's place, 64px with the reader at the top and
// 2,600px with them further down. Now the place is put back on Back alone,
// before the page is painted, and held while the rows around it are drawn;
// a fresh visit opens at the top with "Continue at" when the reader had gone
// into the line.
//
// What a reader would notice if this broke: the timeline jumps after it
// arrives, Back lands somewhere else, or "Continue at" offers the row they
// are already looking at.

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  RESTORE_SETTLE_FRAMES,
  RESTORE_STEADY_FRAMES,
  RESTORE_WATCH_FRAMES,
  WHOLE_ATTR,
  loadKeptPlace,
  loadPosition,
  placeToContinue,
  restorePosition,
  savePosition,
  type TimelinePosition,
} from "../scroll";

type Listener = () => void;

/** A page with the pinned era name at 48px, 55px tall: the line is at 103px. */
function stubTimeline() {
  const listeners = new Map<string, Set<Listener>>();
  const frames: (() => void)[] = [];
  const state = { scrollY: 0, scrolls: [] as number[] };
  /** Rows by slug: their top on the PAGE. The screen's top is `top - scrollY`. */
  const rows = new Map<string, number>();
  const head = { offsetHeight: 55 };
  const attrs = new Set<string>();
  const root = {
    setAttribute: (name: string) => void attrs.add(name),
    removeAttribute: (name: string) => void attrs.delete(name),
  };

  const win = {
    getComputedStyle: () => ({ top: "48px" }),
    scrollBy: ({ top }: { top: number }) => {
      state.scrolls.push(top);
      state.scrollY += top;
    },
    requestAnimationFrame: (fn: () => void) => {
      frames.push(fn);
      return frames.length;
    },
    cancelAnimationFrame: () => {
      frames.length = 0;
    },
    addEventListener: (type: string, fn: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Listener) => {
      listeners.get(type)?.delete(fn);
    },
  };
  const doc = {
    documentElement: root,
    querySelector: (selector: string) => (selector === ".history-era-head" ? head : null),
    getElementById: (id: string) => {
      const slug = id.replace(/^event-/, "");
      if (!rows.has(slug)) return null;
      return { getBoundingClientRect: () => ({ top: rows.get(slug)! - state.scrollY }) };
    },
  };
  (globalThis as { window?: unknown }).window = win;
  (globalThis as { document?: unknown }).document = doc;

  return {
    state,
    rows,
    /** Whether the rows are drawn whole (html[data-history-whole]). */
    whole: () => attrs.has(WHOLE_ATTR),
    /** The row's top on the screen now. */
    screenTop: (slug: string) => rows.get(slug)! - state.scrollY,
    frame: () => {
      const fn = frames.shift();
      if (!fn) return false;
      fn();
      return true;
    },
    run: (limit = 1000) => {
      let n = 0;
      while (n < limit && frames.length) {
        frames.shift()!();
        n += 1;
      }
      return n;
    },
    waiting: () => frames.length,
    fire: (type: string) => {
      for (const fn of [...(listeners.get(type) ?? [])]) fn();
    },
    listening: (type: string) => listeners.get(type)?.size ?? 0,
  };
}

const kept = (anchorSlug: string, offsetPx: number): TimelinePosition => ({ anchorSlug, offsetPx, savedAt: 0 });

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { document?: unknown }).document;
});

describe("the timeline's place, put back on Back", () => {
  it("is there before the page is painted: the rows drawn whole, the row back on the line less its offset, at the call", () => {
    const b = stubTimeline();
    b.rows.set("first-council-of-nicaea", 2700);
    restorePosition(kept("first-council-of-nicaea", -79));
    // No frame has run: the layout effect's own call put it there, measured
    // with every row at its real height.
    expect(b.whole()).toBe(true);
    expect(b.screenTop("first-council-of-nicaea")).toBe(103 - 79);
    expect(b.state.scrolls).toHaveLength(1);
  });

  it("is held through the browser putting its own number back late, then the rows are let go", () => {
    const b = stubTimeline();
    b.rows.set("first-council-of-nicaea", 2700);
    restorePosition(kept("first-council-of-nicaea", -79));
    // The browser's own number for this entry arrives after the page drew.
    b.state.scrollY = 2600;
    b.frame();
    expect(b.screenTop("first-council-of-nicaea")).toBe(24);
    expect(b.whole()).toBe(true);
    const ran = b.run();
    // Watched until still, not a frame past the watch, and two more before
    // the rows are let go, their real heights kept as placeholders.
    expect(ran + 1).toBeGreaterThanOrEqual(RESTORE_SETTLE_FRAMES + 2);
    expect(ran + 1).toBeLessThanOrEqual(RESTORE_WATCH_FRAMES + 2);
    expect(b.whole()).toBe(false);
    expect(b.waiting()).toBe(0);
    expect(b.listening("touchstart")).toBe(0);
    expect(RESTORE_STEADY_FRAMES).toBeLessThan(RESTORE_SETTLE_FRAMES);
  });

  it("leaves the page to the reader's hand at once", () => {
    const b = stubTimeline();
    b.rows.set("great-schism-1054", 5200);
    restorePosition(kept("great-schism-1054", -20));
    b.fire("touchstart");
    b.rows.set("great-schism-1054", 5300);
    // Only the two frames that let the rows go: nothing moves.
    expect(b.run()).toBe(2);
    expect(b.state.scrolls).toHaveLength(1);
    expect(b.whole()).toBe(false);
    for (const type of ["touchstart", "wheel", "keydown", "pointerdown"]) expect(b.listening(type)).toBe(0);
  });

  it("ends when the page goes (the effect's clean-up)", () => {
    const b = stubTimeline();
    b.rows.set("pentecost", 549);
    const stop = restorePosition(kept("pentecost", 446));
    stop();
    b.run();
    expect(b.whole()).toBe(false);
    expect(b.waiting()).toBe(0);
    expect(b.listening("wheel")).toBe(0);
  });

  it("lets a newer put-back keep the rows whole when an older one lets go", () => {
    const b = stubTimeline();
    b.rows.set("pentecost", 549);
    const first = restorePosition(kept("pentecost", 446));
    first();
    restorePosition(kept("pentecost", 446));
    // The first one's two frames pass (and one of the second's watch between
    // them); the second still holds the rows whole.
    for (let i = 0; i < 3; i++) b.frame();
    expect(b.whole()).toBe(true);
    b.run();
    expect(b.whole()).toBe(false);
  });

  it("moves nothing when the kept row is not on the line", () => {
    const b = stubTimeline();
    restorePosition(kept("council-of-florence", -10));
    b.run();
    expect(b.state.scrolls).toEqual([]);
  });

  it("does nothing where there is no window", () => {
    expect(() => restorePosition(kept("pentecost", 0))()).not.toThrow();
  });
});

describe("Continue at, on a fresh visit", () => {
  it("offers the row the reader had reached on the line", () => {
    expect(placeToContinue(kept("first-council-of-nicaea", -79), "pentecost")).toBe("first-council-of-nicaea");
    // At the line exactly.
    expect(placeToContinue(kept("pentecost", 0), "pentecost")).toBe("pentecost");
    // Between two eras the next era's first row is still under the line.
    expect(placeToContinue(kept("edict-of-milan", 40), "pentecost")).toBe("edict-of-milan");
  });

  it("offers nothing when the reader was at the top, the line's first row still under the pinned name", () => {
    // What the spy kept on a first visit that never scrolled: Pentecost 446px under the line.
    expect(placeToContinue(kept("pentecost", 446), "pentecost")).toBeNull();
    expect(placeToContinue(null, "pentecost")).toBeNull();
  });
});

describe("the place kept, for Back and for a later visit", () => {
  function storage() {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the top for Back, and the place reached on the line for Continue at", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", storage());
    vi.stubGlobal("localStorage", storage());
    // Read down to Nicaea: kept for both.
    savePosition("first-council-of-nicaea", -79);
    expect(loadKeptPlace()?.anchorSlug).toBe("first-council-of-nicaea");
    // A later visit opens at the top and goes no further: Back returns to the
    // top, and the next visit still offers Nicaea.
    savePosition("pentecost", 446, { mirror: false });
    expect(loadPosition()).toMatchObject({ anchorSlug: "pentecost", offsetPx: 446 });
    expect(loadKeptPlace()).toMatchObject({ anchorSlug: "first-council-of-nicaea", offsetPx: -79 });
  });

  it("is nothing where there is no window", () => {
    expect(loadKeptPlace()).toBeNull();
    expect(() => savePosition("pentecost", 0)).not.toThrow();
  });
});
