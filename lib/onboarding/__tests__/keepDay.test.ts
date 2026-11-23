// A day kept on its page is kept once (lib/onboarding/keepDay.ts). The owner,
// 2026-11-23: yes to "Done for today", and yes to a prayer's own finish
// keeping a prayer's day.
//
// What a reader would notice if this broke: a second tap on Done while the
// first is still moving, or a prayer's end told twice, takes two days off the
// week, and tomorrow's step is gone before they have seen it.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const counted: [number, string][] = [];
vi.mock("@/lib/analytics/moreCount", () => ({ countWeekStep: (n: number, did: string) => void counted.push([n, did]) }));

const WEEK = "purify:week";
let store: Map<string, string>;

beforeEach(() => {
  counted.length = 0;
  store = new Map();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    dispatchEvent: () => true,
  });
  vi.stubGlobal("CustomEvent", class {});
});
afterEach(() => vi.unstubAllGlobals());

const at = (day: string) => new Date(`${day}T10:00:00`);

describe("keeping a day on its page", () => {
  it("takes today's step and counts it kept, by its day of the seven", async () => {
    const { keepDay } = await import("../keepDay");
    store.set(WEEK, JSON.stringify({ at: 2, day: "2026-12-05", passed: 0 }));
    expect(keepDay(2, at("2026-12-06"))).toBe(true);
    expect(JSON.parse(store.get(WEEK)!)).toEqual({ at: 3, day: "2026-12-06", passed: 0 });
    expect(counted).toEqual([[3, "kept"]]);
  });

  it("keeps it once: asked again, it takes nothing more and counts nothing more", async () => {
    const { keepDay } = await import("../keepDay");
    store.set(WEEK, JSON.stringify({ at: 2, day: "2026-12-05", passed: 0 }));
    expect(keepDay(2, at("2026-12-06"))).toBe(true);
    expect(keepDay(2, at("2026-12-06"))).toBe(false);
    expect(keepDay(3, at("2026-12-06"))).toBe(false);
    expect(JSON.parse(store.get(WEEK)!)).toEqual({ at: 3, day: "2026-12-06", passed: 0 });
    expect(counted).toHaveLength(1);
  });

  it("never keeps a step that is not the one waiting today", async () => {
    const { keepDay } = await import("../keepDay");
    store.set(WEEK, JSON.stringify({ at: 2, day: "2026-12-05", passed: 0 }));
    expect(keepDay(4, at("2026-12-06"))).toBe(false);
    expect(keepDay(1, at("2026-12-06"))).toBe(false);
    expect(JSON.parse(store.get(WEEK)!)).toEqual({ at: 2, day: "2026-12-05", passed: 0 });
    expect(counted).toEqual([]);
  });

  it("keeps the first day of a week that has not begun, and nothing once the week is over", async () => {
    const { keepDay } = await import("../keepDay");
    expect(keepDay(0, at("2026-12-06"))).toBe(true);
    expect(JSON.parse(store.get(WEEK)!)).toEqual({ at: 1, day: "2026-12-06", passed: 0 });
    store.set(WEEK, JSON.stringify({ at: 7, day: "2026-12-05", passed: 0 }));
    expect(keepDay(7, at("2026-12-06"))).toBe(false);
    expect(keepDay(6, at("2026-12-06"))).toBe(false);
  });
});
