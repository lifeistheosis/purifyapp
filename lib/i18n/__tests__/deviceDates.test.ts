// Can this device write a date in the reader's language?
//
// What a reader would notice if this broke: "Sun · M11 13, 2026" over the
// calendar on a phone set to Georgian, where the engine has no Georgian.

import { afterEach, describe, expect, it, vi } from "vitest";

import { formatLongDate, formatLongDateDual, formatMonthDay, formatMonthYear } from "@/lib/calendar/orthodox";

import { forgetDeviceDatesForTests, writesDatesIn } from "../deviceDates";
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
