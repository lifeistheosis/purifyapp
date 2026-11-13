import { describe, expect, it } from "vitest";

import { fastingStatus, type CalStyle, type FastRuleId } from "@/lib/calendar/orthodox";

import { dayNumber, dayOf, daysAhead, fastOn, weekDays, type FastId } from "../fasts";

/**
 * The companion never speaks of a fast the calendar does not show: every day
 * of four years, in both reckonings, the run fasts.ts finds is the fast
 * fastingStatus names.
 */

const FAMILY: Record<FastId, readonly FastRuleId[]> = {
  nativity: ["nativityWeekend", "nativityWedFri", "nativityFinal", "nativityWeekday"],
  great_lent: ["lentPalmSunday", "lentAnnunciation", "lentWineOil", "lentStrict"],
  apostles: ["apostlesWeekend", "apostlesWedFri", "apostlesWeekday"],
  dormition: ["dormitionTransfiguration", "dormitionWineOil", "dormitionStrict"],
};
const OF_ANY_FAST = new Set(Object.values(FAMILY).flat());

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("the fasts, day by day against the calendar", () => {
  for (const style of ["new", "old"] as CalStyle[]) {
    it(`agree with fastingStatus on every day of 2026 to 2029 on the ${style} calendar`, () => {
      const wrong: string[] = [];
      for (let n = dayNumber(day("2026-01-01")); n <= dayNumber(day("2029-12-31")); n++) {
        const d = dayOf(n);
        const fast = fastOn(d, style);
        const rule = fastingStatus(d, style).ruleId;
        const ok = fast ? FAMILY[fast.id].includes(rule) : !OF_ANY_FAST.has(rule);
        if (!ok) wrong.push(`${d.toISOString().slice(0, 10)}: ${fast?.id ?? "no fast"} vs ${rule}`);
      }
      expect(wrong).toEqual([]);
    });
  }
});

describe("the Nativity Fast of 2026", () => {
  it("runs 15 November to 24 December on the New Calendar, forty days", () => {
    expect(fastOn(day("2026-11-14"), "new")).toBeNull();
    const first = fastOn(day("2026-11-15"), "new")!;
    expect(first).toMatchObject({ id: "nativity", key: "nativity-2026", dayIndex: 0, week: 0, length: 40 });
    expect(fastOn(day("2026-12-24"), "new")).toMatchObject({ dayIndex: 39, week: 5 });
    expect(fastOn(day("2026-12-25"), "new")).toBeNull();
  });

  it("runs 28 November to 6 January by the civil date on the Old Calendar, and is still the 2026 fast in January", () => {
    expect(fastOn(day("2026-11-27"), "old")).toBeNull();
    expect(fastOn(day("2026-11-28"), "old")).toMatchObject({ key: "nativity-2026", dayIndex: 0 });
    expect(fastOn(day("2027-01-06"), "old")).toMatchObject({ key: "nativity-2026", dayIndex: 39 });
    expect(fastOn(day("2027-01-07"), "old")).toBeNull();
  });

  it("gives a week's days, and the last week only to the fast's end", () => {
    const fast = fastOn(day("2026-11-15"), "new")!;
    expect(weekDays(fast, 1).map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-11-22",
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
    ]);
    expect(weekDays(fast, 5).map((d) => d.toISOString().slice(0, 10))).toEqual(["2026-12-20", "2026-12-21", "2026-12-22", "2026-12-23", "2026-12-24"]);
    expect(daysAhead(fast, day("2026-12-22")).length).toBe(3);
  });
});

describe("Great Lent", () => {
  it("runs Clean Monday to Holy Saturday, the same civil days in both reckonings", () => {
    // Pascha 2027 is 2 May: Clean Monday 15 March, Holy Saturday 1 May.
    for (const style of ["new", "old"] as CalStyle[]) {
      expect(fastOn(day("2027-03-14"), style)).toBeNull();
      expect(fastOn(day("2027-03-15"), style)).toMatchObject({ id: "great_lent", key: "great_lent-2027", dayIndex: 0, length: 48 });
      expect(fastOn(day("2027-05-01"), style)).toMatchObject({ id: "great_lent", dayIndex: 47 });
      expect(fastOn(day("2027-05-02"), style)).toBeNull();
    }
  });
});
