import { describe, it, expect } from "vitest";
import type { FastKind } from "@/lib/calendar/orthodox";
import {
  isFastingDay,
  dayKey,
  localDayToUtcNoon,
  computeStreak,
  summarize,
  type CheckinStatus,
  type FastCheckin,
} from "../streak";

const T = new Date(2026, 6, 13); // Mon 2026-07-13, local
const D = (y: number, m: number, day: number) => dayKey(new Date(y, m, day));

/** Everything is a fasting day unless listed in `open`. */
function kindMaker(open: Set<string> = new Set()): (d: Date) => FastKind {
  return (d) => (open.has(dayKey(d)) ? "normal" : "fast");
}

function statuses(entries: [string, CheckinStatus][]): Map<string, CheckinStatus> {
  return new Map(entries);
}

describe("isFastingDay", () => {
  it("counts the four fast rules, not the open days", () => {
    expect(["strict", "wine-oil", "fish", "fast"].every((k) => isFastingDay(k as FastKind))).toBe(true);
    expect(isFastingDay("fast-free")).toBe(false);
    expect(isFastingDay("normal")).toBe(false);
  });
});

describe("computeStreak", () => {
  it("is 0 with no marks", () => {
    expect(computeStreak(statuses([]), kindMaker(), T)).toBe(0);
  });

  it("counts consecutive kept/partial fasting days back from today", () => {
    const s = statuses([
      [D(2026, 6, 13), "kept"],
      [D(2026, 6, 12), "partial"],
      [D(2026, 6, 11), "kept"],
    ]);
    expect(computeStreak(s, kindMaker(), T)).toBe(3);
  });

  it("forgives today when it is a fasting day left unmarked", () => {
    const s = statuses([
      [D(2026, 6, 12), "kept"],
      [D(2026, 6, 11), "kept"],
    ]);
    // today (13th) unmarked: skipped, not broken; prior two still count
    expect(computeStreak(s, kindMaker(), T)).toBe(2);
  });

  it("breaks on a broken day", () => {
    const s = statuses([
      [D(2026, 6, 13), "kept"],
      [D(2026, 6, 12), "broken"],
      [D(2026, 6, 11), "kept"],
    ]);
    expect(computeStreak(s, kindMaker(), T)).toBe(1);
  });

  it("breaks on an unmarked PAST fasting day", () => {
    const s = statuses([
      [D(2026, 6, 13), "kept"],
      // 12th is a fasting day with no mark -> streak stops after today
      [D(2026, 6, 11), "kept"],
    ]);
    expect(computeStreak(s, kindMaker(), T)).toBe(1);
  });

  it("treats non-fasting days as transparent", () => {
    // the 12th is an open day; it should neither count nor break
    const s = statuses([
      [D(2026, 6, 13), "kept"],
      [D(2026, 6, 11), "kept"],
    ]);
    const kindOf = kindMaker(new Set([D(2026, 6, 12)]));
    expect(computeStreak(s, kindOf, T)).toBe(2);
  });
});

describe("localDayToUtcNoon", () => {
  it("resolves a local calendar day to UTC noon of that same date", () => {
    // Regardless of the runner's timezone, the UTC date must equal the local date.
    const d = new Date(2026, 6, 10, 3, 30); // Jul 10 local, early morning
    const noon = localDayToUtcNoon(d);
    expect(noon.getUTCFullYear()).toBe(2026);
    expect(noon.getUTCMonth()).toBe(6);
    expect(noon.getUTCDate()).toBe(10);
    expect(noon.getUTCHours()).toBe(12);
  });
});

describe("summarize", () => {
  it("tallies by status", () => {
    const list: FastCheckin[] = [
      { id: "1", day: D(2026, 6, 13), status: "kept", fastKind: "fast", updatedAt: 0 },
      { id: "2", day: D(2026, 6, 12), status: "partial", fastKind: "fast", updatedAt: 0 },
      { id: "3", day: D(2026, 6, 11), status: "broken", fastKind: "fast", updatedAt: 0 },
      { id: "4", day: D(2026, 6, 10), status: "kept", fastKind: "fast", updatedAt: 0 },
    ];
    expect(summarize(list)).toEqual({ kept: 2, partial: 1, broken: 1, total: 4 });
  });
});
