import { describe, expect, it } from "vitest";

import { fastNotAllowedKey } from "@/lib/calendar/fastFoods";
import { fastingStatus, type FastKind } from "@/lib/calendar/orthodox";
import { getMessages } from "@/lib/i18n";

import { FOODS, fastMarks } from "../fastMarks";

// The fast on Today as marks (1.8, the owner's pick B of round 12): wine,
// oil, fish, and meat with dairy and eggs, lit for what the day's rule
// allows and struck for what it does not, read from the calendar's own rule.

const lit = (kind: FastKind) => fastMarks(kind)?.filter((m) => m.allowed).map((m) => m.food) ?? null;
const day = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));
const onDay = (y: number, m: number, d: number) => lit(fastingStatus(day(y, m, d), "new").kind);

describe("the fast's marks", () => {
  it("are the four foods, in the band's order, on every fast day", () => {
    for (const kind of ["strict", "wine-oil", "fish", "fast"] as const) {
      expect(fastMarks(kind)!.map((m) => m.food), kind).toEqual([...FOODS]);
    }
  });

  it("light what each kind of fast day allows", () => {
    expect(lit("strict")).toEqual([]);
    expect(lit("wine-oil")).toEqual(["wine", "oil"]);
    expect(lit("fish")).toEqual(["wine", "oil", "fish"]);
    expect(lit("fast")).toEqual(["wine", "oil", "fish"]);
  });

  it("never light meat, dairy and eggs on a fast day", () => {
    for (const kind of ["strict", "wine-oil", "fish", "fast"] as const) {
      expect(fastMarks(kind)!.find((m) => m.food === "meat")!.allowed, kind).toBe(false);
    }
  });

  it("are none on a day with no fast, which says its rule in words", () => {
    expect(fastMarks("normal")).toBeNull();
    expect(fastMarks("fast-free")).toBeNull();
  });

  it("agree with what the calendar's own lines say is not allowed", () => {
    // The "not allowed" line names what a day keeps from; the struck marks are the same foods.
    const en = getMessages("en");
    for (const kind of ["wine-oil", "fish", "fast"] as const) {
      const line = en[fastNotAllowedKey(kind)!].toLowerCase();
      const struck = fastMarks(kind)!.filter((m) => !m.allowed).map((m) => m.food);
      expect(line.includes("fish"), kind).toBe(struck.includes("fish"));
      expect(line.includes("meat"), kind).toBe(struck.includes("meat"));
    }
  });
});

describe("the marks of real days, from the calendar's rule", () => {
  it("Friday 13 November 2026, a Friday fast: wine and oil", () => {
    expect(fastingStatus(day(2026, 11, 13), "new").ruleId).toBe("fridayFast");
    expect(onDay(2026, 11, 13)).toEqual(["wine", "oil"]);
  });

  it("a Monday of the Nativity Fast: fish, wine and oil", () => {
    expect(fastingStatus(day(2026, 11, 16), "new").ruleId).toBe("nativityWeekday");
    expect(onDay(2026, 11, 16)).toEqual(["wine", "oil", "fish"]);
  });

  it("a Wednesday of the Nativity Fast: nothing", () => {
    expect(fastingStatus(day(2026, 11, 18), "new").ruleId).toBe("nativityWedFri");
    expect(onDay(2026, 11, 18)).toEqual([]);
  });

  it("a Sunday with no fast, and the Twelve Days: no marks", () => {
    expect(onDay(2026, 10, 25)).toBeNull();
    expect(onDay(2026, 12, 28)).toBeNull();
  });
});
