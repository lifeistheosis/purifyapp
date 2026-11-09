// Holy Week's plan (1.9, his yes of 2026-11-09 to the sheet's 12): the Gospel
// the Church reads each day from Lazarus Saturday to Pascha, from the
// calendar's own readings, and its card from two weeks before.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { orthodoxPascha } from "@/lib/calendar/pascha";
import { HOLY_WEEK_DAYS, dayLabel, getPlan, gospelPassages } from "@/lib/plans/plans";
import { SEASON_PICTURES, seasonNow } from "@/lib/plans/season";

const NAMES: Record<string, string> = { matthew: "Matthew", mark: "Mark", luke: "Luke", john: "John" };
const plan = getPlan("holyweek")!;

describe("Holy Week's plan", () => {
  it("is nine days, Lazarus Saturday to Pascha, each the Gospel the calendar gives", () => {
    expect(HOLY_WEEK_DAYS.map((d) => d.offset)).toEqual([-8, -7, -6, -5, -4, -3, -2, -1, 0]);
    expect(HOLY_WEEK_DAYS[0].service).toBe("Lazarus Saturday");
    expect(HOLY_WEEK_DAYS[8].service).toBe("Pascha, the Feast of Feasts");
    expect(plan.days.length).toBe(9);
    // Each day is named exactly as the calendar names its Gospel.
    plan.days.forEach((day, i) => expect(dayLabel(day, (s) => NAMES[s])).toBe(HOLY_WEEK_DAYS[i].gospel));
  });

  it("reads Holy Thursday's composite Gospel passage by passage, across three Gospels", () => {
    const thursday = plan.days[5];
    expect(thursday.filter((r) => r.ref).map((r) => `${r.book} ${r.ref}`)).toEqual([
      "matthew 26:2-20",
      "john 13:3-17",
      "matthew 26:21-39",
      "luke 22:43-45",
      "matthew 26:40-27:2",
    ]);
    // Each passage opens at its first verse; the last runs on into chapter 27.
    expect(thursday.map((r) => `${r.book} ${r.chapter}:${r.verse}`)).toEqual([
      "matthew 26:2",
      "john 13:3",
      "matthew 26:21",
      "luke 22:43",
      "matthew 26:40",
      "matthew 27:1",
    ]);
  });

  it("refuses a passage that is not a Gospel's, rather than guess", () => {
    expect(() => gospelPassages("Romans 6:3-11")).toThrow(/not a Gospel passage/);
  });

  it("is a season's plan, with a picture the apps carry", () => {
    expect(plan.season).toBe("holyweek");
    expect(fs.existsSync(path.join("public", SEASON_PICTURES.holyweek))).toBe(true);
  });
});

describe("Holy Week's card", () => {
  // Pascha 2027 is 2 May; Lazarus Saturday 24 April; the card from 10 April.
  const day = (m: number, d: number) => new Date(2027, m - 1, d, 9);
  it("stands from two weeks before Lazarus Saturday to Pascha, the same on both calendars", () => {
    expect(orthodoxPascha(2027).toISOString().slice(0, 10)).toBe("2027-05-02");
    for (const style of ["new", "old"] as const) {
      expect(seasonNow(day(4, 9), style)).toBeNull();
      expect(seasonNow(day(4, 10), style)).toEqual({ planId: "holyweek", begins: new Date(Date.UTC(2027, 3, 24, 12)) });
      expect(seasonNow(day(4, 24), style)).toEqual({ planId: "holyweek", begins: null });
      expect(seasonNow(day(5, 2), style)).toEqual({ planId: "holyweek", begins: null });
      expect(seasonNow(day(5, 3), style)).toBeNull();
    }
  });

  it("leaves the Nativity's card as it was", () => {
    expect(seasonNow(new Date(2026, 10, 20, 9), "new")?.planId).toBe("nativity");
  });
});
