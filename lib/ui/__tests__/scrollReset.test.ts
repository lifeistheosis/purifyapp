// A page opened by going forward starts at its top and is held there until
// the reader touches it; going back is not this module's (returnPlace.test.ts
// has that half). The measurements that asked for this are in
// ../scrollReset.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  HOLD_MS,
  TRAVERSAL_MS,
  endScrollHold,
  noteTraversal,
  onRouteCommitted,
  resetScrollResetForTests,
} from "../scrollReset";

type Listener = () => void;

function stubBrowser(hash = "") {
  const listeners = new Map<string, Set<Listener>>();
  const style = new Map<string, string>();
  const scrolls: [number, number][] = [];
  const win = {
    location: { hash },
    scrollTo: (x: number, y: number) => {
      scrolls.push([x, y]);
    },
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
    addEventListener: (type: string, fn: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Listener) => {
      listeners.get(type)?.delete(fn);
    },
  };
  const doc = {
    documentElement: {
      style: {
        setProperty: (k: string, v: string) => void style.set(k, v),
        removeProperty: (k: string) => void style.delete(k),
      },
    },
  };
  (globalThis as { window?: unknown }).window = win;
  (globalThis as { document?: unknown }).document = doc;
  return {
    win,
    style,
    scrolls,
    fire: (type: string) => {
      for (const fn of [...(listeners.get(type) ?? [])]) fn();
    },
    listening: (type: string) => listeners.get(type)?.size ?? 0,
  };
}

describe("scroll reset on a forward navigation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetScrollResetForTests();
  });

  afterEach(() => {
    resetScrollResetForTests();
    vi.useRealTimers();
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
  });

  it("puts the new page at its top and switches scroll anchoring off", () => {
    const b = stubBrowser();
    expect(onRouteCommitted()).toBe("reset");
    expect(b.scrolls).toEqual([[0, 0]]);
    expect(b.style.get("overflow-anchor")).toBe("none");
  });

  it("gives anchoring back the moment the reader touches the page", () => {
    const b = stubBrowser();
    onRouteCommitted();
    b.fire("touchstart");
    expect(b.style.has("overflow-anchor")).toBe(false);
    // And stops listening: nothing is left behind on the window.
    for (const type of ["touchstart", "wheel", "keydown", "pointerdown"]) {
      expect(b.listening(type)).toBe(0);
    }
  });

  it("gives anchoring back by itself when nothing is touched", () => {
    const b = stubBrowser();
    onRouteCommitted();
    vi.advanceTimersByTime(HOLD_MS - 1);
    expect(b.style.get("overflow-anchor")).toBe("none");
    vi.advanceTimersByTime(2);
    expect(b.style.has("overflow-anchor")).toBe(false);
  });

  it("leaves a step back through history where the browser puts it", () => {
    const b = stubBrowser();
    noteTraversal();
    expect(onRouteCommitted()).toBe("traversal");
    expect(b.scrolls).toEqual([]);
    expect(b.style.has("overflow-anchor")).toBe(false);
    // The mark is spent: the next page, opened forward, starts at its top.
    expect(onRouteCommitted()).toBe("reset");
  });

  it("does not let a stale popstate excuse a later navigation", () => {
    const b = stubBrowser();
    // A popstate that committed no route: back from a #hash on the same page.
    noteTraversal();
    vi.advanceTimersByTime(TRAVERSAL_MS + 1);
    expect(onRouteCommitted()).toBe("reset");
    expect(b.scrolls).toEqual([[0, 0]]);
  });

  it("leaves a link to a place on a page to the router", () => {
    const b = stubBrowser("#post-123");
    expect(onRouteCommitted()).toBe("hash");
    expect(b.scrolls).toEqual([]);
    expect(b.style.has("overflow-anchor")).toBe(false);
  });

  it("a second navigation during the hold starts a fresh one, and one release ends it", () => {
    const b = stubBrowser();
    onRouteCommitted();
    vi.advanceTimersByTime(HOLD_MS - 500);
    onRouteCommitted();
    expect(b.scrolls).toEqual([
      [0, 0],
      [0, 0],
    ]);
    // The first hold's timer must not end the second one early.
    vi.advanceTimersByTime(600);
    expect(b.style.get("overflow-anchor")).toBe("none");
    expect(b.listening("touchstart")).toBe(1);
    endScrollHold();
    expect(b.style.has("overflow-anchor")).toBe(false);
    expect(b.listening("touchstart")).toBe(0);
  });

  it("does nothing where there is no window", () => {
    expect(onRouteCommitted()).toBe("none");
  });
});
