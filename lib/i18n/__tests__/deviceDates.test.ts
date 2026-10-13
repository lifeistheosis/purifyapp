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

import { dateLocale, deviceDateLocale, forgetDeviceDatesForTests, writesDatesIn } from "../deviceDates";
import { LOCALES } from "../locales";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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

describe("deviceDateLocale", () => {
  // The shop, the messages and the profile write a date the device's own
  // way: its own language, its region's order of day and month.
  const day = new Date(Date.UTC(2026, 10, 13, 12));
  const short = { month: "short", day: "numeric", timeZone: "UTC" } as const;

  it("leaves a device that can write its own language alone", () => {
    for (const language of ["en-GB", "en-US", "el-GR", "ro-RO", "fil-PH", "ka-GE"]) {
      vi.stubGlobal("navigator", { language });
      expect(deviceDateLocale(), language).toBeUndefined();
    }
  });

  it("so a reader in Britain keeps the day before the month", () => {
    // Why these places are not handed the app's "en": that is American order.
    expect(day.toLocaleDateString("en-GB", short)).toBe("13 Nov");
    expect(day.toLocaleDateString("en", short)).toBe("Nov 13");
  });

  it("hands English to a device that cannot write its own language", () => {
    vi.spyOn(Intl.DateTimeFormat, "supportedLocalesOf").mockReturnValue([]);
    forgetDeviceDatesForTests();
    vi.stubGlobal("navigator", { language: "ka-GE" });
    expect(deviceDateLocale()).toBe("en");
    expect(day.toLocaleDateString(deviceDateLocale(), short)).toBe("Nov 13");
  });

  it("changes nothing where there is no device to ask", () => {
    vi.stubGlobal("navigator", undefined);
    expect(deviceDateLocale()).toBeUndefined();
    vi.stubGlobal("navigator", {});
    expect(deviceDateLocale()).toBeUndefined();
  });
});

describe("every screen that writes a date the device's own way", () => {
  // Passing the device nothing is how "M11 13" reaches an order, a message or
  // a profile on a phone whose engine has no data for the phone's own
  // language. Each of those places passes deviceDateLocale() instead.
  //
  // The admin and the owner's screens are left as they are: they are on the
  // website only, on the owner's own computer. The support page and a
  // seller's pages write their dates on the server, which is never the
  // reader's device, and a seller's pages are on the website only. A time
  // zone asked of the engine is not a date.
  const root = join(__dirname, "..", "..", "..");
  const LEFT = [
    /^components\/admin\//,
    /^components\/owner\//,
    /^lib\/admin\//,
    /^app\/admin\//,
    /^app\/owner\//,
    /^app\/\(app\)\/support\/page\.tsx$/,
    /^app\/\(app\)\/shop\/seller\//,
  ];
  const OWN_WAY = new RegExp(
    [
      String.raw`\.toLocale(?:Date|Time)String\(\s*(?:undefined\b|\))`,
      String.raw`\.toLocaleString\(\s*undefined\s*,\s*\{[^}]*\b(?:year|month|day|weekday|hour|minute|dateStyle|timeStyle)\b`,
      String.raw`Intl\.(?:DateTimeFormat|RelativeTimeFormat)\(\s*(?:undefined\b|\)(?!\s*\.resolvedOptions))`,
    ].join("|"),
  );

  const sources: string[] = [];
  for (const top of ["app", "components", "lib"]) {
    for (const entry of readdirSync(join(root, top), { recursive: true, encoding: "utf8" })) {
      const path = `${top}/${entry.replace(/\\/g, "/")}`;
      if (!/\.tsx?$/.test(path) || path.includes("__tests__") || path.includes("node_modules")) continue;
      if (LEFT.some((left) => left.test(path))) continue;
      sources.push(path);
    }
  }

  it("asks whether the device can write its own language first", () => {
    expect(sources.length).toBeGreaterThan(1000);
    expect(sources.filter((path) => OWN_WAY.test(readFileSync(join(root, path), "utf8")))).toEqual([]);
  });

  it("and the pattern does catch the three ways it was written", () => {
    for (const was of [
      "new Date(iso).toLocaleDateString(undefined, {",
      "new Date(iso).toLocaleDateString()",
      "new Date(iso).toLocaleString(undefined, {\n  month: \"short\",",
      "new Intl.DateTimeFormat(undefined, { month: \"long\" })",
    ]) {
      expect(OWN_WAY.test(was), was).toBe(true);
    }
    for (const fine of [
      "new Date(iso).toLocaleDateString(deviceDateLocale(), {",
      "Intl.DateTimeFormat().resolvedOptions().timeZone",
      "total.toLocaleString(undefined, { maximumFractionDigits: 1 })",
    ]) {
      expect(OWN_WAY.test(fine), fine).toBe(false);
    }
  });

  it("in seventeen files", () => {
    const using = sources.filter((path) => readFileSync(join(root, path), "utf8").includes("deviceDateLocale("));
    // The seventeen screens, and the module itself.
    expect(using.length).toBe(18);
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
