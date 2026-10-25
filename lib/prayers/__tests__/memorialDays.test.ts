import { describe, expect, it } from "vitest";

import { isSoulSaturday, memorialDayOf, soulSaturdays } from "../storage";

// Memorial days (1.8): the third, ninth and fortieth days after a falling
// asleep, the day itself counted as the first, and the Saturdays of the
// Souls, which hang on Pascha.

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 9, 30);

describe("the third, ninth and fortieth days", () => {
  it("counts the day of falling asleep as the first", () => {
    expect(memorialDayOf("2026-10-01", day(2026, 10, 1))).toBeNull();
    expect(memorialDayOf("2026-10-01", day(2026, 10, 3))).toBe(3);
    expect(memorialDayOf("2026-10-01", day(2026, 10, 9))).toBe(9);
    expect(memorialDayOf("2026-10-01", day(2026, 11, 9))).toBe(40);
  });

  it("crosses months and a change of the clocks without losing a day", () => {
    // 40 days from 2026-03-01, over the spring clock change.
    expect(memorialDayOf("2026-03-01", day(2026, 4, 9))).toBe(40);
    expect(memorialDayOf("2026-03-01", day(2026, 4, 8))).toBeNull();
  });

  it("is nothing on other days, or for a date it cannot read", () => {
    expect(memorialDayOf("2026-10-01", day(2026, 10, 4))).toBeNull();
    expect(memorialDayOf("2026-10-01", day(2026, 9, 30))).toBeNull();
    expect(memorialDayOf("1 October", day(2026, 10, 3))).toBeNull();
  });
});

describe("the Saturdays of the Souls", () => {
  it("falls on Meatfare Saturday, the second to fourth of Lent, and before Pentecost", () => {
    // Pascha 2027 is 2 May (Clean Monday 15 March, Pentecost 20 June).
    expect(soulSaturdays(2027)).toEqual(["2027-03-06", "2027-03-27", "2027-04-03", "2027-04-10", "2027-06-19"]);
  });

  it("is a Saturday every time", () => {
    for (const year of [2026, 2027, 2028, 2030]) {
      for (const key of soulSaturdays(year)) expect(new Date(`${key}T12:00:00`).getDay(), key).toBe(6);
    }
  });

  it("knows the day on the reader's own clock", () => {
    expect(isSoulSaturday(day(2027, 3, 27))).toBe(true);
    expect(isSoulSaturday(day(2027, 3, 28))).toBe(false);
  });
});
