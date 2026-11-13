// Discover's doors in the reader's own order (1.9, build 95 note 9; lib/discover/doorOrder.ts).
//
// His word, 2026-11-13: "allow the user to hold down each section and the
// haptic feedback hits and they can move each section according to their
// wants". What a reader would notice if this broke: a door moved and found
// back in its old place on the next visit, a door gone from Discover because
// the kept order did not name it, a door that came in a release dropped to the
// end or the top, the first order not coming back, or the page drawn in the
// first order and then jumping into the reader's once the app has started.

import vm from "node:vm";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ORDER_EVENT,
  ORDER_KEY,
  PREPAINT_ID,
  dropPrepaint,
  keepOrder,
  mergeOrder,
  moveDoor,
  orderPrepaint,
  parseOrder,
  readOrder,
  sameOrder,
  subscribeOrder,
} from "@/lib/discover/doorOrder";

const FIRST = ["/saints", "/reading", "/history", "/councils", "/theology", "/chants", "/calendar", "/walkthroughs", "/shop", "/community", "/start", "/parishes"];

/** A window with storage and events, as the phone's web view has. */
function fakeWindow({ shut = false }: { shut?: boolean } = {}) {
  const store = new Map<string, string>();
  const listeners = new Map<string, Set<(e: unknown) => void>>();
  const storage = {
    getItem: (k: string) => {
      if (shut) throw new Error("storage shut");
      return store.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (shut) throw new Error("storage shut");
      store.set(k, v);
    },
    removeItem: (k: string) => {
      if (shut) throw new Error("storage shut");
      store.delete(k);
    },
  };
  const win = {
    localStorage: storage,
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: (e: unknown) => void) => listeners.get(type)?.delete(fn),
    dispatchEvent: (e: { type: string }) => {
      for (const fn of listeners.get(e.type) ?? []) fn(e);
      return true;
    },
  };
  return { win, store, listeners };
}

describe("the order of Discover's doors", () => {
  it("is the first order when nothing is kept", () => {
    expect(mergeOrder(FIRST, null)).toEqual(FIRST);
    expect(parseOrder(null)).toBeNull();
    expect(parseOrder("")).toBeNull();
  });

  it("is the kept order when every door is named", () => {
    const kept = [...FIRST].reverse();
    expect(mergeOrder(FIRST, kept)).toEqual(kept);
  });

  it("leaves out a door that has gone, and names each door once", () => {
    expect(mergeOrder(["/a", "/b", "/c"], ["/c", "/kitchen", "/a", "/c", "/b"])).toEqual(["/c", "/a", "/b"]);
  });

  it("puts a door the kept order does not name in its own place in the first order", () => {
    // The Shop opening after the reader had moved the doors: it comes in
    // where the first order has it, not at the top and not at the end.
    const noShop = FIRST.filter((id) => id !== "/shop");
    const kept = moveDoor(noShop, noShop.indexOf("/parishes"), 0);
    const merged = mergeOrder(FIRST, kept);
    expect(merged.indexOf("/shop")).toBe(FIRST.indexOf("/shop"));
    expect(merged.filter((id) => id !== "/shop")).toEqual(kept);
    // Two new doors, early and late, each in its own place.
    expect(mergeOrder(["/a", "/b", "/c", "/d", "/e"], ["/d", "/b"])).toEqual(["/a", "/d", "/c", "/b", "/e"]);
    expect(mergeOrder(["/a", "/b", "/c", "/d", "/e"], ["/e", "/d"])).toEqual(["/a", "/b", "/c", "/e", "/d"]);
  });

  it("reads only a list of addresses as an order", () => {
    expect(parseOrder("{")).toBeNull();
    expect(parseOrder('{"a":1}')).toBeNull();
    expect(parseOrder('"/saints"')).toBeNull();
    expect(parseOrder('["/saints", 3, null, "/reading"]')).toEqual(["/saints", "/reading"]);
  });

  it("moves one door and leaves the others in their order", () => {
    expect(moveDoor(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveDoor(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveDoor(["a", "b", "c", "d"], 1, 1)).toEqual(["a", "b", "c", "d"]);
    expect(moveDoor(["a", "b", "c", "d"], 1, 99)).toEqual(["a", "c", "d", "b"]);
    expect(moveDoor(["a", "b"], 5, 0)).toEqual(["a", "b"]);
    expect(sameOrder(["a", "b"], ["a", "b"])).toBe(true);
    expect(sameOrder(["a", "b"], ["b", "a"])).toBe(false);
  });
});

describe("the order kept on this device", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is there on the next visit, after a door is moved", () => {
    const { win, store } = fakeWindow();
    vi.stubGlobal("window", win);
    const moved = moveDoor(FIRST, FIRST.indexOf("/chants"), 0);
    keepOrder(moved, FIRST);
    expect(JSON.parse(store.get(ORDER_KEY) ?? "null")).toEqual(moved);
    // The next visit reads it back, whole.
    expect(readOrder(FIRST)).toEqual(moved);
    expect(readOrder(FIRST)[0]).toBe("/chants");
  });

  it("keeps nothing for the first order, so the way back holds no order at all", () => {
    const { win, store } = fakeWindow();
    vi.stubGlobal("window", win);
    keepOrder(moveDoor(FIRST, 2, 5), FIRST);
    expect(store.has(ORDER_KEY)).toBe(true);
    keepOrder(FIRST, FIRST);
    expect(store.has(ORDER_KEY)).toBe(false);
    expect(readOrder(FIRST)).toEqual(FIRST);
  });

  it("holds the order for the visit when storage is shut", () => {
    const { win } = fakeWindow({ shut: true });
    vi.stubGlobal("window", win);
    const moved = moveDoor(FIRST, 0, 3);
    keepOrder(moved, FIRST);
    expect(readOrder(FIRST)).toEqual(moved);
    keepOrder(FIRST, FIRST);
    expect(readOrder(FIRST)).toEqual(FIRST);
  });

  it("tells the list at once, and hears another tab", () => {
    const { win } = fakeWindow();
    vi.stubGlobal("window", win);
    const heard = vi.fn();
    const stop = subscribeOrder(heard);
    keepOrder(moveDoor(FIRST, 0, 1), FIRST);
    expect(heard).toHaveBeenCalledTimes(1);
    win.dispatchEvent({ type: "storage", key: ORDER_KEY } as unknown as { type: string });
    win.dispatchEvent({ type: "storage", key: "purify:something-else" } as unknown as { type: string });
    expect(heard).toHaveBeenCalledTimes(2);
    stop();
    keepOrder(FIRST, FIRST);
    expect(heard).toHaveBeenCalledTimes(2);
    expect(ORDER_EVENT).toBe("purify:discover-order:change");
  });
});

describe("the order before the first paint", () => {
  /** Run the pre-paint as a page would, and read the order its style lays on the doors. */
  function paint(first: string[], kept: string | null): { order: string[] | null; css: string | null } {
    const added: { id: string; textContent: string }[] = [];
    const sandbox = {
      localStorage: { getItem: (k: string) => (k === ORDER_KEY ? kept : null) },
      document: {
        createElement: () => ({ id: "", textContent: "" }),
        head: { appendChild: (el: { id: string; textContent: string }) => added.push(el) },
      },
    };
    vm.runInNewContext(orderPrepaint(first), sandbox);
    if (!added.length) return { order: null, css: null };
    expect(added).toHaveLength(1);
    expect(added[0].id).toBe(PREPAINT_ID);
    const rules = [...added[0].textContent.matchAll(/\[data-door-list\]>\[data-door="([^"]+)"\]\{order:(\d+)\}/g)];
    const order: string[] = [];
    for (const [, id, n] of rules) order[Number(n)] = id;
    return { order, css: added[0].textContent };
  }

  it("lays the same order on the doors as the list will draw", () => {
    const cases: (string[] | null)[] = [
      [...FIRST].reverse(),
      moveDoor(FIRST, FIRST.indexOf("/parishes"), 1),
      ["/chants", "/saints"],
      ["/kitchen", "/calendar", "/calendar", "/start"],
      FIRST.filter((id) => id !== "/shop"),
    ];
    for (const kept of cases) {
      expect(paint(FIRST, JSON.stringify(kept)).order, JSON.stringify(kept)).toEqual(mergeOrder(FIRST, kept));
    }
  });

  it("draws nothing of its own when nothing, or nothing readable, is kept", () => {
    expect(paint(FIRST, null).css).toBeNull();
    expect(paint(FIRST, "not json").css).toBeNull();
    expect(paint(FIRST, '{"a":1}').css).toBeNull();
    expect(paint(FIRST, "[]").css).toBeNull();
  });

  it("writes only the server's own addresses into the style", () => {
    // A kept order is read, never trusted: words that would close the rule
    // and open another never reach the style.
    const { css } = paint(FIRST, JSON.stringify(['"]{} body{display:none} [x="', "/saints"]));
    expect(css).not.toContain("display:none");
    expect(css).toContain('[data-door="/saints"]{order:0}');
  });

  it("is taken out once the list draws the order itself", () => {
    const removed = vi.fn();
    vi.stubGlobal("document", { getElementById: (id: string) => (id === PREPAINT_ID ? { remove: removed } : null) });
    dropPrepaint();
    expect(removed).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe("a page drawn with no window", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("is drawn in the first order, as the server draws it", () => {
    expect(readOrder(FIRST)).toEqual(FIRST);
    expect(() => keepOrder(FIRST, FIRST)).not.toThrow();
  });
});
