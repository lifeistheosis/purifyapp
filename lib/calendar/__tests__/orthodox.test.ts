// Unit tests for the Orthodox calendar pure functions. The Pascha algorithm
// is the highest-stakes math in the codebase: a one-day error cascades into
// the entire moveable cycle (Lent, Holy Week, Pascha, Ascension, Pentecost,
// Apostles' Fast start). These cases are cross-referenced against the
// canonical Pascha dates published by the Ecumenical Patriarchate and the
// OCA paschalion.

import { describe, expect, it } from "vitest";
import {
  orthodoxPascha,
  fastingStatus,
  paschaInfo,
} from "@/lib/calendar/orthodox";

/** Build a Date at noon UTC for a Gregorian Y-M-D (month is 1-indexed). */
function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** Strip a Date to its Gregorian {year, month (1-indexed), day} in UTC. */
function ymd(d: Date): { y: number; m: number; d: number } {
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

describe("orthodoxPascha", () => {
  // Canonical Orthodox Pascha dates, Gregorian display, 2024-2030.
  // Source: Ecumenical Patriarchate paschalion + OCA published calendar.
  const cases: Array<[number, number, number]> = [
    [2024, 5, 5], // May 5
    [2025, 4, 20], // April 20
    [2026, 4, 12], // April 12
    [2027, 5, 2], // May 2
    [2028, 4, 16], // April 16
    [2029, 4, 8], // April 8
    [2030, 4, 28], // April 28
  ];

  for (const [year, month, day] of cases) {
    it(`returns ${year}-${month}-${day} for year ${year}`, () => {
      expect(ymd(orthodoxPascha(year))).toEqual({ y: year, m: month, d: day });
    });
  }
});

describe("fastingStatus", () => {
  it("returns strict for Holy Friday (Pascha - 2)", () => {
    // Pascha 2026 = April 12, so Holy Friday = April 10 (Friday).
    const result = fastingStatus(utc(2026, 4, 10));
    expect(result.kind).toBe("strict");
    expect(result.label).toMatch(/Great Lent/i);
  });

  it("returns fast-free for Bright Monday (Pascha + 1)", () => {
    // Pascha 2026 = April 12, so Bright Monday = April 13.
    const result = fastingStatus(utc(2026, 4, 13));
    expect(result.kind).toBe("fast-free");
    expect(result.label).toMatch(/Bright Week/i);
  });

  it("returns wine-oil for a weekly Wednesday in ordinary time", () => {
    // July 8, 2026 is a Wednesday. After Apostles' Fast end (June 28),
    // before Dormition Fast (Aug 1). Year-round Wed/Fri rule applies.
    const result = fastingStatus(utc(2026, 7, 8));
    expect(result.kind).toBe("wine-oil");
    expect(result.label).toMatch(/Wednesday/i);
  });
});

describe("paschaInfo", () => {
  it("counts 109 days from Jan 1, 2025 to Pascha 2025 (April 20)", () => {
    const info = paschaInfo(utc(2025, 1, 1));
    expect(info.daysAway).toBe(109);
    expect(ymd(info.date)).toEqual({ y: 2025, m: 4, d: 20 });
    expect(info.label).toMatch(/until Pascha/i);
  });

  it("greets on Pascha day itself", () => {
    const info = paschaInfo(utc(2026, 4, 12));
    expect(info.daysAway).toBe(0);
    expect(info.label).toMatch(/Pascha is today/i);
  });

  it("rolls over to next year once this year's Pascha has passed", () => {
    // June 1, 2026, Pascha 2026 (April 12) is past, so the next target
    // is Pascha 2027 (May 2).
    const info = paschaInfo(utc(2026, 6, 1));
    expect(ymd(info.date)).toEqual({ y: 2027, m: 5, d: 2 });
    expect(info.daysAway).toBeGreaterThan(300);
  });
});
