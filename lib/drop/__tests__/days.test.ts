import { describe, expect, it } from "vitest";

import { currentSeason, fastingStatus } from "@/lib/calendar/orthodox";

import { OCCASIONS, addDays, countdown, daysBetween, dropDays, dueDays, isDay, longDay, occasionDay, shortDay, type Occasion } from "../days";

/**
 * The drop day and the Church's year it is planned against.
 *
 * The dates are only worth listing if they are the Church's, so they are held
 * here two ways: to published dates of Pascha, and to the app's own calendar
 * (lib/calendar/orthodox.ts), which must agree about where Great Lent, the
 * Nativity Fast and the weeks after Pascha and Pentecost begin.
 */

const occasion = (key: string): Occasion => {
  const found = OCCASIONS.find((o) => o.key === key);
  if (!found) throw new Error(`no occasion ${key}`);
  return found;
};
const noon = (day: string) => new Date(`${day}T12:00:00Z`);

describe("a day", () => {
  it("is a day that exists, written as 2026-11-12", () => {
    expect(isDay("2026-11-12")).toBe(true);
    expect(isDay("2028-02-29")).toBe(true);
    expect(isDay("2026-02-29")).toBe(false);
    expect(isDay("2026-02-30")).toBe(false);
    expect(isDay("2026-13-01")).toBe(false);
    expect(isDay("2026-1-5")).toBe(false);
    expect(isDay("next week")).toBe(false);
    expect(isDay(null)).toBe(false);
    expect(isDay(20261112)).toBe(false);
  });

  it("is counted across months and years, and read the same on every machine", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-10-14", "2026-11-12")).toBe(29);
    expect(daysBetween("2026-11-12", "2026-10-14")).toBe(-29);
    expect(longDay("2026-11-12")).toBe("Thu 12 Nov 2026");
    expect(shortDay("2027-01-06")).toBe("Wed 6 Jan");
  });

  it("says how far off it is in words a line can end on", () => {
    expect(countdown("2026-11-12", "2026-10-14")).toBe("29 days to go");
    expect(countdown("2026-11-12", "2026-11-11")).toBe("1 day to go");
    expect(countdown("2026-11-12", "2026-11-12")).toBe("the day itself");
    expect(countdown("2026-11-12", "2026-11-13")).toBe("1 day ago");
    expect(countdown("2026-11-12", "2026-11-16")).toBe("4 days ago");
  });
});

describe("the Church's year", () => {
  it("has Pascha where the published Paschalion has it", () => {
    expect(occasionDay(occasion("pascha"), 2026)).toBe("2026-04-12");
    expect(occasionDay(occasion("pascha"), 2027)).toBe("2027-05-02");
    expect(occasionDay(occasion("pascha"), 2028)).toBe("2028-04-16");
  });

  it("counts Great Lent and Pentecost from Pascha, and keeps the fixed feasts on the New Calendar", () => {
    expect(occasionDay(occasion("great-lent"), 2027)).toBe("2027-03-15");
    expect(longDay(occasionDay(occasion("great-lent"), 2027))).toMatch(/^Mon /);
    expect(occasionDay(occasion("pentecost"), 2027)).toBe("2027-06-20");
    expect(occasionDay(occasion("nativity-fast"), 2026)).toBe("2026-11-15");
    expect(occasionDay(occasion("nativity"), 2026)).toBe("2026-12-25");
    expect(occasionDay(occasion("theophany"), 2027)).toBe("2027-01-06");
    expect(occasionDay(occasion("dormition"), 2027)).toBe("2027-08-15");
    expect(occasionDay(occasion("church-new-year"), 2027)).toBe("2027-09-01");
    expect(occasionDay(occasion("elevation"), 2027)).toBe("2027-09-14");
  });

  it("agrees with the app's own calendar about where each season turns", () => {
    for (const year of [2026, 2027, 2028, 2029]) {
      const lent = occasionDay(occasion("great-lent"), year);
      expect(currentSeason(noon(lent))?.label, `${year}: Clean Monday`).toBe("Great Lent");
      expect(currentSeason(noon(addDays(lent, -1)))?.label, `${year}: the day before`).not.toBe("Great Lent");

      const pascha = occasionDay(occasion("pascha"), year);
      expect(fastingStatus(noon(pascha)).ruleId, `${year}: Pascha`).toBe("brightWeek");
      expect(fastingStatus(noon(addDays(pascha, -1))).ruleId, `${year}: Holy Saturday`).not.toBe("brightWeek");

      const pentecost = occasionDay(occasion("pentecost"), year);
      expect(fastingStatus(noon(addDays(pentecost, 1))).ruleId, `${year}: the day after Pentecost`).toBe("trinityWeek");
      expect(fastingStatus(noon(pentecost)).ruleId, `${year}: Pentecost`).not.toBe("trinityWeek");

      const fast = occasionDay(occasion("nativity-fast"), year);
      expect(currentSeason(noon(fast))?.label, `${year}: the fast's first day`).toBe("Nativity Fast");
      expect(currentSeason(noon(addDays(fast, -1)))?.label ?? null, `${year}: the day before`).not.toBe("Nativity Fast");
    }
  });
});

describe("drop days", () => {
  it("lists the next occasions from a day on, each with a day three days ahead of it", () => {
    const list = dropDays("2026-10-14");
    expect(list.map((d) => [d.occasion.key, d.on, d.drop])).toEqual([
      ["nativity-fast", "2026-11-15", "2026-11-12"],
      ["nativity", "2026-12-25", "2026-12-22"],
      ["theophany", "2027-01-06", "2027-01-03"],
      ["great-lent", "2027-03-15", "2027-03-12"],
      ["pascha", "2027-05-02", "2027-04-29"],
      ["pentecost", "2027-06-20", "2027-06-17"],
      ["dormition", "2027-08-15", "2027-08-12"],
      ["church-new-year", "2027-09-01", "2027-08-29"],
      ["elevation", "2027-09-14", "2027-09-11"],
    ]);
  });

  it("takes how many, and how far ahead, and keeps an occasion that falls on the first day", () => {
    expect(dropDays("2026-11-15", 2, 1).map((d) => [d.on, d.drop])).toEqual([
      ["2026-11-15", "2026-11-14"],
      ["2026-12-25", "2026-12-24"],
    ]);
    // Twenty is more than a year of them: the second year is reached as well.
    const long = dropDays("2026-10-14", 20);
    expect(long).toHaveLength(20);
    expect(long.map((d) => d.on)).toEqual([...long.map((d) => d.on)].sort());
  });

  it("says what is due by when, counted from the drop day", () => {
    expect(dueDays("2026-11-12").map((d) => `${d.word} ${d.on} ${d.moment}`)).toEqual([
      "By 2026-11-05 ready",
      "By 2026-11-05 submit",
      "On 2026-11-12 web",
      "From 2026-11-12 stores",
      "From 2026-11-15 after",
      "From 2026-11-19 numbers",
    ]);
  });
});
