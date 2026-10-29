// The Old Calendar reader's fasts, seasons and readings, day by day.
//
// A reader reported it on 2026-10-29: "The fast days on my Android always
// show on Tuesday and Thursday instead of Wednesday and Friday." Every surface
// handed the fast rule the day moved back 13 days, and the rule read the
// weekday and the Paschal cycle from it. These pin the answer on real civil
// days, so the split (the menaion moves 13 days, the weekday and the Paschal
// cycle do not) cannot quietly go back.
//
// Dates are civil, at UTC noon. Pascha 2026 is April 12 and Pascha 2027 is
// May 2, the same civil day in both reckonings.

import { describe, expect, it } from "vitest";
import { currentSeason, dayReadings, fastingStatus, readingsOptionsFor } from "@/lib/calendar/orthodox";

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);
const oldRule = (iso: string) => fastingStatus(day(iso), "old").ruleId;
const newRule = (iso: string) => fastingStatus(day(iso), "new").ruleId;

describe("the weekly fast keeps its weekday", () => {
  it("falls on Wednesday and Friday for an Old Calendar reader", () => {
    expect(oldRule("2026-09-29")).toBe("noFast"); // Tuesday
    expect(oldRule("2026-09-30")).toBe("wednesdayFast");
    expect(oldRule("2026-10-01")).toBe("noFast"); // Thursday
    expect(oldRule("2026-10-02")).toBe("fridayFast");
  });

  it("is the same day in both reckonings outside the fixed fasts", () => {
    for (const iso of ["2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03"]) {
      expect(oldRule(iso), iso).toBe(newRule(iso));
    }
  });
});

describe("the Paschal cycle is on the civil day", () => {
  it("starts Lent on Clean Monday", () => {
    expect(oldRule("2026-02-23")).toBe("lentStrict");
    expect(currentSeason(day("2026-02-23"), "old")?.label).toBe("Great Lent");
  });

  it("keeps Bright Week fast-free", () => {
    expect(oldRule("2026-04-13")).toBe("brightWeek");
    expect(currentSeason(day("2026-04-13"), "old")?.label).toBe("Bright Week");
  });

  it("puts the Annunciation on the reader's March 25, inside Lent", () => {
    // Civil April 7, 2026 is Julian March 25: fish within Lent.
    expect(oldRule("2026-04-07")).toBe("lentAnnunciation");
    // Civil March 25, 2026 is a Lenten Wednesday for them.
    expect(oldRule("2026-03-25")).toBe("lentStrict");
    expect(newRule("2026-03-25")).toBe("lentAnnunciation");
  });

  it("starts the Apostles' Fast after All Saints and ends it on the reader's June 28", () => {
    // Pascha 2026, April 12: All Saints June 7, the fast from June 8.
    expect(oldRule("2026-06-08")).toBe(newRule("2026-06-08"));
    // Civil July 5 is Julian June 22: still the fast (a Sunday, fish).
    expect(oldRule("2026-07-05")).toBe("apostlesWeekend");
    expect(newRule("2026-07-05")).toBe("noFast");
    expect(currentSeason(day("2026-07-11"), "old")?.label).toBe("Apostles' Fast");
    // Civil July 12 is Julian June 29, Sts Peter and Paul: the fast is over.
    expect(oldRule("2026-07-12")).toBe("noFast");
  });
});

describe("the fixed fasts move 13 days", () => {
  it("begins the Nativity Fast on civil November 28", () => {
    // Civil November 27, 2026 is Julian November 14, a Friday.
    expect(oldRule("2026-11-27")).toBe("fridayFast");
    expect(newRule("2026-11-27")).toBe("nativityWedFri");
    // Civil November 28 is Julian November 15, a Saturday of the fast.
    expect(oldRule("2026-11-28")).toBe("nativityWeekend");
    expect(currentSeason(day("2026-11-28"), "old")?.label).toBe("Nativity Fast");
    expect(currentSeason(day("2026-11-27"), "old")?.label).not.toBe("Nativity Fast");
  });

  it("keeps the Twelve Days from civil January 7 to 17", () => {
    // Civil January 6, 2027 is Julian December 24, a Wednesday of the fast.
    expect(oldRule("2027-01-06")).toBe("nativityWedFri");
    expect(oldRule("2027-01-07")).toBe("twelveDays");
    expect(oldRule("2027-01-17")).toBe("twelveDays");
    // Civil January 18 is Julian January 5, a Monday.
    expect(oldRule("2027-01-18")).toBe("noFast");
  });

  it("keeps the Dormition Fast from civil August 14 to 27", () => {
    expect(oldRule("2026-08-13")).not.toMatch(/^dormition/);
    expect(oldRule("2026-08-14")).toMatch(/^dormition/);
    // Civil August 19 is Julian August 6, the Transfiguration.
    expect(oldRule("2026-08-19")).toBe("dormitionTransfiguration");
    expect(oldRule("2026-08-27")).toMatch(/^dormition/);
    expect(oldRule("2026-08-28")).not.toMatch(/^dormition/);
  });
});

describe("the readings", () => {
  it("read the menaion on the reader's own date", () => {
    // Civil January 7, 2027 is the Nativity for an Old Calendar reader.
    const shown = dayReadings(day("2027-01-07"), readingsOptionsFor("old")).readings.map((r) => r.label);
    expect(shown).toEqual(["Galatians 4:4-7", "Matthew 2:1-12"]);
  });

  it("read the Paschal table on the civil day", () => {
    expect(dayReadings(day("2026-04-12"), readingsOptionsFor("old")).source).toBe("paschal");
    expect(dayReadings(day("2026-04-12"), readingsOptionsFor("new")).source).toBe("paschal");
  });
});
