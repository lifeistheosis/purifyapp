import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { nativityFastAround, nativityFastDay, nativityRow } from "../nativity";
import { CREST_Y, NIGHT_H, NIGHT_STARS, RISEN_KEY, STAR_PX, claimRise, riseFrom, shouldRise, starTop } from "../nativityStar";
import { getPath } from "../paths";
import { claimNativityRow, isNativityRowClaimed } from "../useNativityRow";

// The Nativity Fast path on Today (1.8): the day a reader on the path is on,
// or an invitation in the week before the fast and through it.

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 10, 0);
const iso = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);

describe("the fast on each calendar", () => {
  it("runs 15 November to 24 December on the new calendar", () => {
    expect(nativityFastAround(day(2026, 10, 25), "new").map(iso)).toEqual(["2026-11-15", "2026-12-24"]);
  });

  it("runs 28 November to 6 January on the old calendar", () => {
    expect(nativityFastAround(day(2026, 10, 25), "old").map(iso)).toEqual(["2026-11-28", "2027-01-06"]);
  });

  it("still knows last year's fast in the first days of January", () => {
    expect(nativityFastAround(day(2027, 1, 3), "old").map(iso)).toEqual(["2026-11-28", "2027-01-06"]);
    expect(nativityFastAround(day(2027, 1, 3), "new").map(iso)).toEqual(["2027-11-15", "2027-12-24"]);
  });
});

describe("what Today shows", () => {
  it("invites from a week before the fast to its last day, for a reader not on the path", () => {
    expect(nativityRow(day(2026, 11, 7), "new", [], 40)).toBeNull();
    expect(nativityRow(day(2026, 11, 8), "new", [], 40)).toEqual({ kind: "invite" });
    expect(nativityRow(day(2026, 12, 24), "new", [], 40)).toEqual({ kind: "invite" });
    expect(nativityRow(day(2026, 12, 25), "new", [], 40)).toBeNull();
    expect(nativityRow(day(2026, 12, 30), "old", [], 40)).toEqual({ kind: "invite" });
  });

  it("gives a reader on the path the first day not yet read, whenever they read", () => {
    expect(nativityRow(day(2026, 11, 20), "new", [0, 1, 2], 40)).toEqual({ kind: "day", n: 4, of: 40 });
    expect(nativityRow(day(2027, 3, 1), "new", [0, 2], 40)).toEqual({ kind: "day", n: 2, of: 40 });
  });

  it("is quiet once the path is done, or when there is no path", () => {
    expect(nativityRow(day(2026, 12, 1), "new", Array.from({ length: 40 }, (_, i) => i), 40)).toBeNull();
    expect(nativityRow(day(2026, 12, 1), "new", [], 0)).toBeNull();
  });
});

// The Nativity Fast's card on Today (1.8, the owner's pick C of round 9, "The
// star rising", animated): the fast's own day, the star a little higher each
// day, and the rise only on the first view of the reader's day.
describe("the Nativity Fast's card on Today", () => {
  it("counts the fast's own days, 1 to 40, and is quiet outside it", () => {
    expect(nativityFastDay(day(2026, 11, 14), "new")).toBeNull();
    expect(nativityFastDay(day(2026, 11, 15), "new")).toBe(1);
    // 21 November, the Entry of the Theotokos: day 7, the Magnificat's day on the path.
    expect(nativityFastDay(day(2026, 11, 21), "new")).toBe(7);
    expect(nativityFastDay(day(2026, 12, 24), "new")).toBe(40);
    expect(nativityFastDay(day(2026, 12, 25), "new")).toBeNull();
  });

  it("counts them thirteen days later on the old calendar, across the new year", () => {
    expect(nativityFastDay(day(2026, 11, 27), "old")).toBeNull();
    expect(nativityFastDay(day(2026, 11, 28), "old")).toBe(1);
    expect(nativityFastDay(day(2026, 12, 4), "old")).toBe(7);
    expect(nativityFastDay(day(2027, 1, 6), "old")).toBe(40);
    expect(nativityFastDay(day(2027, 1, 7), "old")).toBeNull();
  });

  it("has a day of the path for every day of the fast", () => {
    expect(getPath("nativity")?.days).toHaveLength(40);
  });

  it("stands the star higher each day: low on day 1, near the top on day 40", () => {
    const tops = Array.from({ length: 40 }, (_, i) => starTop(i + 1));
    for (let i = 1; i < tops.length; i++) expect(tops[i]).toBeLessThan(tops[i - 1]);
    // Day 1 just clear of the horizon's crest; day 40 near the top of the night.
    expect(tops[0] + STAR_PX).toBeLessThan(CREST_Y);
    expect(tops[0]).toBeGreaterThan(NIGHT_H * 0.7);
    expect(tops[39]).toBeLessThan(NIGHT_H * 0.25);
    expect(tops[39]).toBeGreaterThan(0);
    // Out of range holds to the ends rather than leaving the night.
    expect(starTop(0)).toBe(tops[0]);
    expect(starTop(41)).toBe(tops[39]);
  });

  it("rises from just under the crest to the day's height", () => {
    for (const d of [1, 7, 40]) expect(starTop(d) + riseFrom(d)).toBe(CREST_Y - 4);
  });

  it("holds the path while it shows, so the row in The Church today gives way, and lets it go after", () => {
    expect(isNativityRowClaimed()).toBe(false);
    const release = claimNativityRow();
    expect(isNativityRowClaimed()).toBe(true);
    // A second card (a remount before the first lets go) holds it too.
    const second = claimNativityRow();
    release();
    release();
    expect(isNativityRowClaimed()).toBe(true);
    second();
    expect(isNativityRowClaimed()).toBe(false);
  });

  it("keeps its small stars inside the night, each with a time of its own", () => {
    expect(NIGHT_STARS.length).toBeGreaterThan(10);
    for (const s of NIGHT_STARS) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(350);
      expect(s.y + s.r).toBeLessThan(CREST_Y - 30);
    }
    expect(new Set(NIGHT_STARS.map((s) => `${s.dur}/${s.delay}`)).size).toBeGreaterThan(10);
  });
});

describe("the star's rise, on the first view of the day only", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = new Map();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rises when the day kept is not today", () => {
    expect(shouldRise(null, "2026-11-21")).toBe(true);
    expect(shouldRise("2026-11-20", "2026-11-21")).toBe(true);
    expect(shouldRise("2026-11-21", "2026-11-21")).toBe(false);
  });

  it("rises on the first view, keeps the day, and stands up on every later view that day", () => {
    expect(claimRise("2026-11-21")).toBe(true);
    expect(store.get(RISEN_KEY)).toBe("2026-11-21");
    expect(claimRise("2026-11-21")).toBe(false);
    expect(claimRise("2026-11-21")).toBe(false);
    // The next day, it rises again, once.
    expect(claimRise("2026-11-22")).toBe(true);
    expect(claimRise("2026-11-22")).toBe(false);
  });

  it("still rises when the device cannot keep the day", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(claimRise("2026-11-21")).toBe(true);
    expect(claimRise("2026-11-21")).toBe(true);
  });
});
