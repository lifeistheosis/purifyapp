import { describe, expect, it } from "vitest";

import { nativityFastAround, nativityRow } from "../nativity";

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
