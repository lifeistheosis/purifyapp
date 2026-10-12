// Can this device write a date in the reader's language?
//
// What a reader would notice if this broke: "Sun · M11 13, 2026" over the
// calendar on a phone set to Georgian, where the engine has no Georgian.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { wroteWhen } from "@/lib/bible/noteAge";
import { formatLongDate, formatLongDateDual, formatMonthDay, formatMonthYear } from "@/lib/calendar/orthodox";
import { relativeTime } from "@/lib/community/relativeTime";
import { recordDate } from "@/lib/profile/dates";

import { dateLocale, forgetDeviceDatesForTests, writesDatesIn } from "../deviceDates";
import { LOCALES } from "../locales";

afterEach(() => {
  vi.restoreAllMocks();
  forgetDeviceDatesForTests();
});

describe("writesDatesIn", () => {
  it("says yes for every language of the app, on an engine that carries them all", () => {
    // Node does. This is the website's server and the build.
    for (const { code } of LOCALES) expect(writesDatesIn(code), code).toBe(true);
  });

  it("says no for what is not a language, without throwing", () => {
    expect(writesDatesIn("not a language")).toBe(false);
    expect(writesDatesIn("")).toBe(false);
  });

  it("believes the engine when it says it has no such language", () => {
    const asked = vi.spyOn(Intl.DateTimeFormat, "supportedLocalesOf").mockImplementation((wanted) => {
      const list = Array.isArray(wanted) ? wanted : [wanted];
      return (list as string[]).filter((code) => code !== "ka" && code !== "ne");
    });
    expect(writesDatesIn("ka")).toBe(false);
    expect(writesDatesIn("ne")).toBe(false);
    expect(writesDatesIn("el")).toBe(true);
    // Asked once per language, however often a screen draws.
    const calls = asked.mock.calls.length;
    for (let i = 0; i < 50; i += 1) writesDatesIn("ka");
    expect(asked.mock.calls.length).toBe(calls);
  });
});

describe("dateLocale", () => {
  it("is the reader's language where the device can write it, and English where it cannot", () => {
    for (const { code } of LOCALES) expect(dateLocale(code), code).toBe(code);
    vi.spyOn(Intl.DateTimeFormat, "supportedLocalesOf").mockReturnValue([]);
    forgetDeviceDatesForTests();
    expect(dateLocale("ka")).toBe("en");
    expect(dateLocale("ne")).toBe("en");
  });

  it("so a date, a weekday and an age come out in English there, not as a pattern", () => {
    vi.spyOn(Intl.DateTimeFormat, "supportedLocalesOf").mockReturnValue([]);
    forgetDeviceDatesForTests();
    const day = new Date(Date.UTC(2026, 10, 13, 12));
    expect(new Intl.DateTimeFormat(dateLocale("ka"), { month: "long", timeZone: "UTC" }).format(day)).toBe("November");
    expect(recordDate("2026-05-19T00:11:00Z", "ka", { month: "long", day: "numeric" })).toBe("May 19");
    expect(relativeTime("2026-11-10T12:00:00Z", "ne", day.getTime())).toBe("3 days ago");
    expect(wroteWhen("2026-08-13T12:00:00Z", "ka", day)).toBe("3 months ago");
  });
});

describe("every screen that asks the device for a date", () => {
  // Handing the device the reader's language as it stands is how "M11 13"
  // reaches a screen. Each place hands it dateLocale(locale) instead. The two
  // modules that have English of their own to keep ask writesDatesIn().
  const root = join(__dirname, "..", "..", "..");
  const OWN_ENGLISH = ["lib/calendar/orthodox.ts", "lib/saints/feastDay.ts"];
  const BARE = /(?:Intl\.(?:DateTimeFormat|RelativeTimeFormat)|\.toLocale(?:Date|Time)?String)\(\s*(?:[a-z]+\.)?locale\s*[,)]/;

  const sources: string[] = [];
  for (const top of ["app", "components", "lib"]) {
    for (const entry of readdirSync(join(root, top), { recursive: true, encoding: "utf8" })) {
      const path = `${top}/${entry.replace(/\\/g, "/")}`;
      if (!/\.tsx?$/.test(path) || path.includes("__tests__") || path.includes("node_modules")) continue;
      sources.push(path);
    }
  }

  it("hands it a language the device can write", () => {
    expect(sources.length).toBeGreaterThan(1000);
    const bare = sources.filter((path) => !OWN_ENGLISH.includes(path) && BARE.test(readFileSync(join(root, path), "utf8")));
    expect(bare).toEqual([]);
  });

  it("or keeps its own English, and says so", () => {
    for (const path of OWN_ENGLISH) {
      const source = readFileSync(join(root, path), "utf8");
      expect(source, path).toMatch(BARE);
      expect(source, path).toContain("writesDatesIn(locale)");
    }
  });

  it("and more than twenty places do", () => {
    const using = sources.filter((path) => readFileSync(join(root, path), "utf8").includes("dateLocale("));
    expect(using.length).toBeGreaterThan(20);
  });
});

describe("the calendar's dates on a device that cannot write the language", () => {
  const day = new Date(Date.UTC(2026, 10, 13, 12));

  it("are in the language where the engine has it", () => {
    expect(formatLongDate(day, "ka")).not.toBe(formatLongDate(day));
    expect(formatLongDate(day, "ka")).toMatch(/\p{Script=Georgian}/u);
  });

  it("are in English where it has not, never a bare pattern", () => {
    vi.spyOn(Intl.DateTimeFormat, "supportedLocalesOf").mockReturnValue([]);
    forgetDeviceDatesForTests();
    expect(formatLongDate(day, "ka")).toBe("Friday · November 13, 2026");
    expect(formatLongDateDual(day, "new", "ka")).toBe("Friday · November 13, 2026");
    expect(formatLongDateDual(day, "old", "ka")).toBe("Friday · November 13 / October 31, 2026");
    expect(formatMonthDay(day, "ne")).toBe("November 13");
    expect(formatMonthYear(2026, 10, "ne")).toBe("November 2026");
  });
});
