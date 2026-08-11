import { describe, expect, it } from "vitest";

import {
  canPrayToday,
  computeStreak,
  dayKeySet,
  longestStreak,
  rhythm,
  summarize,
  type CampaignDay,
} from "@/lib/campaigns/streak";

const days = (...keys: string[]): CampaignDay[] =>
  keys.map((day_key) => ({ day_key }));

// A fixed "today" so these never depend on the day the suite runs, the way
// lib/campaigns/__tests__/campaigns.test.ts injects `now`.
const TODAY = "2026-08-11";

describe("dayKeySet", () => {
  it("deduplicates and keeps only well-formed keys", () => {
    const set = dayKeySet(
      days("2026-08-11", "2026-08-11", "2026-08-10", "nonsense", ""),
    );
    expect([...set].sort()).toEqual(["2026-08-10", "2026-08-11"]);
  });

  it("survives a malformed row rather than throwing", () => {
    const rows = [{ day_key: null }, { day_key: 42 }] as unknown as CampaignDay[];
    expect(dayKeySet(rows).size).toBe(0);
  });
});

describe("computeStreak", () => {
  it("is zero with no days", () => {
    expect(computeStreak(dayKeySet([]), TODAY)).toBe(0);
  });

  it("counts today alone as one", () => {
    expect(computeStreak(dayKeySet(days(TODAY)), TODAY)).toBe(1);
  });

  it("counts a consecutive run ending today", () => {
    const set = dayKeySet(days("2026-08-09", "2026-08-10", "2026-08-11"));
    expect(computeStreak(set, TODAY)).toBe(3);
  });

  // The rule that matters most: a reader who has not prayed YET today still
  // has the streak they went to bed with. Without this the number reads zero
  // every morning until the app is opened, which is the exact pressure
  // mechanic CONTRIBUTING forbids.
  it("forgives an unmarked today", () => {
    const set = dayKeySet(days("2026-08-09", "2026-08-10"));
    expect(computeStreak(set, TODAY)).toBe(2);
  });

  it("breaks on a missed day that is not today", () => {
    const set = dayKeySet(days("2026-08-08", "2026-08-10", "2026-08-11"));
    expect(computeStreak(set, TODAY)).toBe(2);
  });

  it("is zero when the most recent day is older than yesterday", () => {
    expect(computeStreak(dayKeySet(days("2026-08-01")), TODAY)).toBe(0);
  });

  it("walks across a month boundary", () => {
    const set = dayKeySet(days("2026-07-31", "2026-08-01", "2026-08-02"));
    expect(computeStreak(set, "2026-08-02")).toBe(3);
  });

  it("walks across a leap day", () => {
    const set = dayKeySet(days("2028-02-28", "2028-02-29", "2028-03-01"));
    expect(computeStreak(set, "2028-03-01")).toBe(3);
  });

  it("returns zero for a malformed anchor rather than looping", () => {
    expect(computeStreak(dayKeySet(days(TODAY)), "not-a-day")).toBe(0);
  });
});

describe("longestStreak", () => {
  it("is zero with no days", () => {
    expect(longestStreak(dayKeySet([]))).toBe(0);
  });

  it("finds the longest run, not the most recent", () => {
    const set = dayKeySet(
      days(
        "2026-07-01",
        "2026-07-02",
        "2026-07-03",
        "2026-07-04",
        "2026-08-10",
        "2026-08-11",
      ),
    );
    expect(longestStreak(set)).toBe(4);
  });

  it("counts a single isolated day as one", () => {
    expect(longestStreak(dayKeySet(days("2026-08-11")))).toBe(1);
  });
});

describe("canPrayToday", () => {
  it("is true when today is unmarked", () => {
    expect(canPrayToday(days("2026-08-10"), TODAY)).toBe(true);
  });

  it("is false once today is marked", () => {
    expect(canPrayToday(days(TODAY), TODAY)).toBe(false);
  });

  // The whole point of moving off PRAY_COOLDOWN_MS. Praying at 21:00 and
  // again at 08:00 the next morning is eleven hours apart, which the old 20h
  // gate refused, and which is plainly two different days to the reader.
  it("allows an early-morning prayer after a late-night one", () => {
    expect(canPrayToday(days("2026-08-10"), "2026-08-11")).toBe(true);
  });
});

describe("summarize", () => {
  it("reports every field in one pass", () => {
    const result = summarize(
      days("2026-08-01", "2026-08-09", "2026-08-10", "2026-08-11"),
      TODAY,
    );
    expect(result).toEqual({
      streak: 3,
      totalDays: 4,
      prayedToday: true,
      longest: 3,
    });
  });

  it("reports prayedToday false and keeps the streak when today is open", () => {
    const result = summarize(days("2026-08-09", "2026-08-10"), TODAY);
    expect(result.prayedToday).toBe(false);
    expect(result.streak).toBe(2);
  });
});

describe("rhythm", () => {
  it("returns the window oldest first, ending today", () => {
    const strip = rhythm(days("2026-08-10"), 3, TODAY);
    expect(strip.map((d) => d.key)).toEqual([
      "2026-08-09",
      "2026-08-10",
      "2026-08-11",
    ]);
    expect(strip.map((d) => d.kept)).toEqual([false, true, false]);
  });

  it("is empty for a malformed anchor", () => {
    expect(rhythm(days(TODAY), 5, "nope")).toEqual([]);
  });
});
