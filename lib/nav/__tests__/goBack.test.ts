// One way back for both bars (1.7, lib/nav/goBack.ts): back with a floor
// that holds. A stubbed window stands in for the browser: the test says
// whether the history moved, and the deadline is run by hand.

import { describe, expect, it } from "vitest";

import { BACK_FALLBACK_MS } from "@/lib/nav/backBar";
import { goBack } from "@/lib/nav/goBack";

type Listener = () => void;

function stubWindow(opts: { canGoBack?: boolean; movesOnBack?: "popstate" | "pagehide" | null } = {}) {
  const listeners = new Map<string, Set<Listener>>();
  const timers: { fn: () => void; ms: number }[] = [];
  const win = {
    navigation: opts.canGoBack === undefined ? undefined : { canGoBack: opts.canGoBack },
    addEventListener(type: string, fn: Listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: Listener) {
      listeners.get(type)?.delete(fn);
    },
    setTimeout(fn: () => void, ms: number) {
      timers.push({ fn, ms });
      return timers.length;
    },
  };
  const fire = (type: string) => {
    for (const fn of [...(listeners.get(type) ?? [])]) fn();
  };
  const calls: string[] = [];
  const router = {
    back: () => {
      calls.push("back");
      if (opts.movesOnBack) fire(opts.movesOnBack);
    },
    push: (href: string) => calls.push(`push ${href}`),
  };
  const runTimers = () => {
    for (const t of timers.splice(0)) t.fn();
  };
  return { win: win as unknown as Parameters<typeof goBack>[2], router, calls, timers, runTimers, listeners };
}

describe("goBack", () => {
  it("goes back and stays when the history moved", () => {
    const s = stubWindow({ movesOnBack: "popstate" });
    goBack(s.router, "/saints", s.win);
    expect(s.timers[0]?.ms).toBe(BACK_FALLBACK_MS);
    s.runTimers();
    expect(s.calls).toEqual(["back"]);
  });

  it("goes to the floor when nothing moved by the deadline", () => {
    // The bottom of a WebView's stack: back() is a silent no-op.
    const s = stubWindow({ movesOnBack: null });
    goBack(s.router, "/saints", s.win);
    expect(s.calls).toEqual(["back"]);
    s.runTimers();
    expect(s.calls).toEqual(["back", "push /saints"]);
  });

  it("goes to the floor at once when the browser says there is nothing of the app behind", () => {
    const s = stubWindow({ canGoBack: false, movesOnBack: "popstate" });
    goBack(s.router, "/saints", s.win);
    expect(s.calls).toEqual(["push /saints"]);
    expect(s.timers).toEqual([]);
  });

  it("does not throw a reader who is leaving for another site back into the app", () => {
    const s = stubWindow({ movesOnBack: "pagehide" });
    goBack(s.router, "/", s.win);
    s.runTimers();
    expect(s.calls).toEqual(["back"]);
  });

  it("leaves no listener behind", () => {
    const s = stubWindow({ movesOnBack: null });
    goBack(s.router, "/", s.win);
    s.runTimers();
    for (const set of s.listeners.values()) expect(set.size).toBe(0);
  });
});
