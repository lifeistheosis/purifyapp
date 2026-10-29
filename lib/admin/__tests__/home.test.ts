import { describe, expect, it } from "vitest";

import { LOADING, NOT_MEASURED, figure, moneyWeek, utcDay, visitorWeeks, weekAxis, weekday } from "../home";

// The Home's figures and its two weeks (the owner's pick A, "One home").

describe("figure", () => {
  it("passes a number through, zero included", () => {
    expect(figure(212, false)).toBe(212);
    expect(figure(0, false)).toBe(0);
  });

  it("says why there is no number, and never draws a zero for one", () => {
    expect(figure(null, true)).toBe(LOADING);
    expect(figure(undefined, true)).toBe(LOADING);
    expect(figure(null, false)).toBe(NOT_MEASURED);
    expect(figure(Number.NaN, false)).toBe(NOT_MEASURED);
  });

  it("marks a missing figure with a word, not a dash", () => {
    // The old Today drew an em dash here (BRIEF-1.8, 2026-10-27).
    for (const mark of [NOT_MEASURED, LOADING]) {
      expect(mark).not.toMatch(/[‒-―-]/);
    }
  });
});

describe("days", () => {
  it("counts back in UTC days and names them", () => {
    const now = new Date("2026-10-28T23:30:00Z");
    expect(utcDay(now)).toBe("2026-10-28");
    expect(utcDay(now, 6)).toBe("2026-10-22");
    expect(weekday("2026-10-28")).toBe("Wed");
    expect(weekday("2026-10-22")).toBe("Thu");
    expect(weekday("not a day")).toBe("not a day");
  });
});

describe("visitorWeeks", () => {
  // Fifteen days ending on Wednesday 28 October, visitors 100 + the day's number.
  const points = Array.from({ length: 15 }, (_, i) => {
    const day = utcDay(new Date("2026-10-28T12:00:00Z"), 14 - i);
    return { date: day, visitors: 100 + i };
  });

  it("puts each of the last seven days beside the same day a week before", () => {
    const week = visitorWeeks(points);
    expect(week).toHaveLength(7);
    expect(week[6]).toEqual({ day: "2026-10-28", visitors: 114, weekBefore: 107 });
    expect(week[0]).toEqual({ day: "2026-10-22", visitors: 108, weekBefore: 101 });
  });

  it("counts a day missing from the series as none, and an empty series as no week", () => {
    const gap = points.filter((p) => p.date !== "2026-10-21" && p.date !== "2026-10-25");
    const week = visitorWeeks(gap);
    expect(week.find((d) => d.day === "2026-10-25")?.visitors).toBe(0);
    expect(week.find((d) => d.day === "2026-10-28")?.weekBefore).toBe(0);
    expect(visitorWeeks([])).toEqual([]);
  });
});

describe("moneyWeek", () => {
  const now = new Date("2026-10-28T09:00:00Z");

  it("takes the last seven days of the series, today last, and adds them up", () => {
    const series = Array.from({ length: 30 }, (_, i) => i * 100);
    const week = moneyWeek(series, now);
    expect(week?.days).toHaveLength(7);
    expect(week?.days[6]).toEqual({ day: "2026-10-28", cents: 2900 });
    expect(week?.days[0]).toEqual({ day: "2026-10-22", cents: 2300 });
    expect(week?.totalCents).toBe(2300 + 2400 + 2500 + 2600 + 2700 + 2800 + 2900);
  });

  it("is no week at all when the series did not come, never a week of zeros", () => {
    expect(moneyWeek([], now)).toBeNull();
    expect(moneyWeek([1, 2, 3], now)).toBeNull();
  });
});

describe("weekAxis", () => {
  it("marks the first day, the middle one, and today", () => {
    const days = ["2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28"].map(
      (day) => ({ day }),
    );
    expect(weekAxis(days)).toEqual(["Thu", "Sun", "today"]);
    expect(weekAxis([])).toBeNull();
  });
});
