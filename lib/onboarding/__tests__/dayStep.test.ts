import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { dayOfPage } from "@/components/onboarding/DayFrame";
import { commemorationsOn } from "@/lib/calendar/orthodox";
import en from "@/lib/i18n/messages/en.json";

import { DAY_STEPS_IN, FRAMED_STEPS, OWN_END_STEPS, PAGE_OF, frameFits, keptOnPage, kindOf, ownEnd } from "../dayFrame";
import { READINGS_LINE, leadsIntoDay, stepOnDay } from "../dayStep";
import type { WeekDay } from "../useWeek";
import { PROTESTANT_WEEKS, ROAD_WEEKS, WEEK_STEPS, type WeekStepKey } from "../week";

/**
 * The two days of a first week that name the Church's own day (2.0, with the
 * day's frame). The owner's "do all" of 2026-11-23, to one pick for each day
 * that opened a list or a hub: today's readings "kept by its own Done at the
 * end of the readings", and the Church's year "becomes that day's saint or
 * feast page (with Done at its end; a day with no such page stays as
 * today)". What they must hold is here.
 */

const src = (path: string) => readFileSync(path, "utf8");
const flat = (path: string) => src(path).replace(/\s+/g, " ");
const keys = Object.keys(WEEK_STEPS) as WeekStepKey[];
const day = (readings: number, saint: string | null) => ({ readings, saint });

describe("which steps lead into the Church's day", () => {
  it("are today's readings and the Church's year, and no other", () => {
    expect(keys.filter((k) => leadsIntoDay(WEEK_STEPS[k]))).toEqual(["churchYear", "readings"]);
  });

  it("are days of a road's own week: six of the sixty-three", () => {
    const weeks = [...Object.values(ROAD_WEEKS), ...Object.values(PROTESTANT_WEEKS)];
    const count = (key: WeekStepKey) => weeks.flat().filter((k) => k === key).length;
    expect(weeks.flat()).toHaveLength(63);
    // Three roads hold today's readings; three hold the Church's year.
    expect(count("readings")).toBe(3);
    expect(count("churchYear")).toBe(3);
  });

  it("every other step is the same on every day", () => {
    for (const key of keys.filter((k) => !leadsIntoDay(WEEK_STEPS[k]))) {
      expect(stepOnDay(WEEK_STEPS[key], day(3, "nicholas-the-wonderworker")), key).toBe(WEEK_STEPS[key]);
    }
  });

  it("no step is led anywhere before the day is known: on the server, and while a page is taken over", () => {
    expect(stepOnDay(WEEK_STEPS.readings, null)).toBe(WEEK_STEPS.readings);
    expect(stepOnDay(WEEK_STEPS.churchYear, null)).toBe(WEEK_STEPS.churchYear);
  });
});

describe("today's readings, as the day opens them", () => {
  it("is kept by the readings' own Done, with the line the app already says of that walk", () => {
    expect(stepOnDay(WEEK_STEPS.readings, day(2, null))).toEqual({
      key: "readings",
      href: "/prayers/today",
      titleKey: "calendar.todaysReadings",
      bodyKey: "readingsFlow.startValue",
      kept: "walk",
    });
    expect(READINGS_LINE).toBe("readingsFlow.startValue");
    expect((en as Record<string, string>)[READINGS_LINE]).toBe("Read them in one go");
  });

  it("leaves its own line behind: it promised the saint and the fast, which the readings do not hold", () => {
    expect((en as Record<string, string>)[WEEK_STEPS.readings.bodyKey!]).toBe("The saint, the fast and the readings for today.");
    for (const n of [1, 2, 5]) expect(stepOnDay(WEEK_STEPS.readings, day(n, null)).bodyKey).not.toBe(WEEK_STEPS.readings.bodyKey);
  });

  it("says no line of one reading: \"them\" is said of more than one", () => {
    const one = stepOnDay(WEEK_STEPS.readings, day(1, null));
    expect(one.kept).toBe("walk");
    expect(one.bodyKey).toBeUndefined();
  });

  it("stays as it was on a day with no readings, so the day can still be taken", () => {
    expect(stepOnDay(WEEK_STEPS.readings, day(0, "nicholas-the-wonderworker"))).toBe(WEEK_STEPS.readings);
  });

  it("says that line in every language the app speaks", () => {
    const dir = "lib/i18n/messages";
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(21);
    for (const file of files) {
      const words = JSON.parse(src(join(dir, file))) as Record<string, string>;
      expect(words[READINGS_LINE], file).toBeTruthy();
      expect(words[READINGS_LINE], file).not.toContain("—");
    }
  });
});

describe("the Church's year, as the day opens it", () => {
  it("is the page of who leads the day, with Done at its end, under the step's own name", () => {
    expect(stepOnDay(WEEK_STEPS.churchYear, day(2, "nicholas-the-wonderworker"))).toEqual({
      key: "churchYear",
      href: "/saints/nicholas-the-wonderworker",
      titleKey: "onboard.day1.churchYear.title",
      kept: "done",
    });
  });

  it("leaves its own line behind: it promised the fast, the readings and the feasts ahead", () => {
    expect((en as Record<string, string>)[WEEK_STEPS.churchYear.bodyKey!]).toBe("Today's saint, fast and readings, and the feasts ahead.");
    expect(stepOnDay(WEEK_STEPS.churchYear, day(2, "nicholas-the-wonderworker")).bodyKey).toBeUndefined();
  });

  it("stays the calendar, under its own line, on a day whose lead has no page in the app: and the calendar has Done at its end", () => {
    const stays = stepOnDay(WEEK_STEPS.churchYear, day(2, null));
    expect(stays).toBe(WEEK_STEPS.churchYear);
    expect(stays.href).toBe("/calendar");
    expect((en as Record<string, string>)[stays.bodyKey!]).toBe("Today's saint, fast and readings, and the feasts ahead.");
    // His "Fix all 3" of 2026-11-23: no day of the Church's year is taken at a tap any more.
    expect(frameFits(stays)).toBe(true);
    expect(keptOnPage(stays)).toBe(true);
    expect(kindOf(stays.href)).toBe("/calendar");
    expect(flat(PAGE_OF["/calendar"])).toContain("<DayEnd ");
  });

  it("stays the calendar when the lead's page is already a day of the reader's own week: no page comes twice", () => {
    const newcomer = ROAD_WEEKS.newcomer.map((k) => WEEK_STEPS[k]);
    expect(newcomer.map((s) => s.key)).toContain("maryOfEgypt");
    expect(stepOnDay(WEEK_STEPS.churchYear, day(2, "mary-of-egypt"), newcomer)).toBe(WEEK_STEPS.churchYear);
    expect(stepOnDay(WEEK_STEPS.churchYear, day(2, "nicholas-the-wonderworker"), newcomer).href).toBe("/saints/nicholas-the-wonderworker");
  });

  it("opens a page that mounts the frame's end: a saint's", () => {
    const led = stepOnDay(WEEK_STEPS.churchYear, day(2, "nicholas-the-wonderworker"));
    expect(kindOf(led.href)).toBe("/saints/");
    expect(DAY_STEPS_IN.churchYear).toBe(PAGE_OF["/saints/"]);
    expect(flat(DAY_STEPS_IN.churchYear!)).toContain("<DayEnd ");
  });

  it("leads into a page on more than a third of the year's days, and never names a page the app lacks", () => {
    // A leap year, day by day, on the new calendar: who leads the day, as lib/calendar/useChurchDay.ts takes it.
    let withPage = 0;
    let days = 0;
    for (let d = new Date(Date.UTC(2028, 0, 1)); d.getUTCFullYear() === 2028; d = new Date(d.getTime() + 86_400_000)) {
      days++;
      const all = commemorationsOn(d);
      const lead = all.find((c) => c.kind === "feast") ?? all[0];
      if (!lead?.saint) continue;
      withPage++;
      expect(lead.saint.slug, d.toISOString()).toBe(lead.slug);
    }
    expect(days).toBe(366);
    expect(withPage).toBeGreaterThan(days / 3);
    // Most days have none yet: on those the day is the calendar, as before.
    expect(withPage).toBeLessThan(days);
  });
});

describe("how such a day is kept", () => {
  const readings = stepOnDay(WEEK_STEPS.readings, day(2, null));
  const year = stepOnDay(WEEK_STEPS.churchYear, day(2, "nicholas-the-wonderworker"));

  it("by its key alone today's readings is kept on no page: on a day with no readings it is taken when opened", () => {
    expect(FRAMED_STEPS).not.toContain("readings");
    expect(OWN_END_STEPS).not.toContain("readings");
    expect(keptOnPage("readings")).toBe(false);
    expect(keptOnPage(WEEK_STEPS.readings)).toBe(false);
  });

  it("by its key alone the Church's year is the calendar, kept by Done at the calendar's end", () => {
    expect(FRAMED_STEPS).toContain("churchYear");
    expect(OWN_END_STEPS).not.toContain("churchYear");
    expect(keptOnPage("churchYear")).toBe(true);
  });

  it("led into the day, the readings are kept by their walk's own Done and the Church's year by Done at its page's end", () => {
    // The walk is on no page of its own: no page finds the readings' day as its day, by Done or by an end of its own.
    expect(frameFits(readings)).toBe(false);
    expect(ownEnd(readings)).toBe(false);
    expect(keptOnPage(readings)).toBe(true);
    expect(frameFits(year)).toBe(true);
    expect(ownEnd(year)).toBe(false);
    expect(keptOnPage(year)).toBe(true);
  });

  it("the Church's year is the reader's day on the lead's own page, and on no other", () => {
    const steps = [WEEK_STEPS.yourRule, readings, WEEK_STEPS.psalter, year, WEEK_STEPS.prayFathers, WEEK_STEPS.beforeSleep, WEEK_STEPS.fathersPath];
    const week = (over: Partial<WeekDay>): WeekDay => ({ road: "practicing", steps, waiting: null, kept: null, ...over });
    expect(dayOfPage(week({ waiting: 3 }), "/saints/nicholas-the-wonderworker/")).toEqual({ index: 3, kept: false, tomorrow: steps[4] });
    expect(dayOfPage(week({ kept: 3 }), "/saints/nicholas-the-wonderworker")).toEqual({ index: 3, kept: true, tomorrow: steps[4] });
    expect(dayOfPage(week({ waiting: 3 }), "/saints/leo-the-great")).toBeNull();
    // Led to the lead's page, the day is not also the calendar's: one end, on one page.
    expect(dayOfPage(week({ waiting: 3 }), "/calendar")).toBeNull();
    expect(dayOfPage(week({ kept: 3 }), "/calendar")).toBeNull();
    // The readings' day is found by no page, so nothing mounted on one can take it for its own: not
    // Done, not a prayer said on the day's page, not the mark at a chapter's end.
    for (const fits of [frameFits, ownEnd]) {
      expect(dayOfPage(week({ waiting: 1 }), "/prayers/today", fits)).toBeNull();
      expect(dayOfPage(week({ kept: 1 }), "/prayers/today", fits)).toBeNull();
      expect(dayOfPage(week({ waiting: 1 }), "/bible/john/1", fits)).toBeNull();
    }
  });

  it("the readings' Done tells the week, in the bar that holds it and nowhere else", () => {
    const bar = flat(DAY_STEPS_IN.readings!);
    expect(bar.split('keepDayOf("readings")').length - 1).toBe(1);
    expect(bar.indexOf("finishReadingsFlow();")).toBeLessThan(bar.indexOf('keepDayOf("readings")'));
    // Nothing of the week is drawn in the Bible's reader for it.
    expect(bar).not.toMatch(/onboard\.week\.|DayEnd|DayKept/);
    const all = ["app", "components", "lib"]
      .flatMap((root) =>
        readdirSync(root, { withFileTypes: true, recursive: true })
          .filter((e) => e.isFile() && /\.tsx?$/.test(e.name) && !e.parentPath.includes("__tests__"))
          .map((e) => join(e.parentPath, e.name)),
      )
      .filter((f) => /keepDayOf\(/.test(src(f)) && f !== "lib/onboarding/keepDay.ts");
    expect(all).toEqual([DAY_STEPS_IN.readings]);
  });
});

describe("where the day is read", () => {
  const hook = flat("lib/onboarding/useWeek.ts");
  const card = flat("components/onboarding/FirstStepsNudge.tsx");

  it("only with the frame, only for today's step, and only when that step names the day", () => {
    const frame = hook.slice(hook.indexOf("export function useWeekDay()"));
    expect(frame).toContain("const at = waiting ?? kept;");
    expect(frame).toContain("if (at != null && churchDay && leadsIntoDay(steps[at])) {");
    expect(frame).toContain("steps[at] = stepOnDay(steps[at], { readings, saint: day.headlineSaint?.slug ?? null }, steps);");
    // A reader without the frame has the week as it was: the card's own hook knows nothing of the day.
    const plain = hook.slice(hook.indexOf("export function useWeekToday()"), hook.indexOf("function daySnapshot()"));
    expect(plain).not.toMatch(/stepOnDay|churchDay|leadsIntoDay/);
  });

  it("the Church's day is derived in its one place, never worked out again here", () => {
    expect(hook).toContain('import { churchDayOf } from "@/lib/calendar/useChurchDay";');
    expect(hook).toContain("const day = churchDayOf(churchDay, style);");
    expect(hook).not.toMatch(/commemorationsOn|dayReadings|shiftForStyle/);
    expect(flat("lib/calendar/useChurchDay.ts")).toContain("export function churchDayOf(today: Date, style: CalStyle): ChurchDay {");
  });

  it("the card opens the first of the day's readings and starts their walk at the tap, before the page opens", () => {
    expect(card).toContain("const weekStep = week ? (day && day.waiting === week.index ? day.steps[week.index] : week.step) : null;");
    expect(card).toContain('const readingsDay = weekStep?.key === "readings" && weekStep.kept === "walk";');
    expect(card).toContain("href={walk.length ? hrefOf(walk[0]) : step.href}");
    expect(card).toMatch(/walk\.length \? \(\) => \{ startReadingsFlow\(walk\); open\(\); \} : open/);
    // The walk is the one Today's own Read all walks.
    expect(card).toContain("dayWalk(churchDayOf(churchDay, style))");
  });

  it("the card writes nothing at the tap on such a day, and says the day is kept once it is", () => {
    expect(card).toContain("const framed = day != null && keptOnPage(step);");
    expect(card).toContain("keep: framed ? () => {} : () => writeWeek(stepTaken(readWeek(), today())),");
    expect(card).toContain("if (day && day.kept != null && !week && keptOnPage(day.steps[day.kept])) {");
  });
});
