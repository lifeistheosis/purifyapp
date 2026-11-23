import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import { dayOfPage } from "@/components/onboarding/DayFrame";

import { DAY_FRAME_LIVE } from "../flags";
import type { WeekDay } from "../useWeek";
import { WEEK_STEPS } from "../week";

/**
 * The day's frame (2.0; docs/plans/onboarding-2.0.md, row 3). The owner,
 * 2026-11-22: "I want each day of the path actually worked on. right now it's
 * just acts as a hyperlink to a page", a day kept by "tapping done"; and his
 * yes of 2026-11-23 to "Done for today" at the end of the day's page, never
 * floating over it. What it must hold is here.
 */

const steps = [WEEK_STEPS.jesusPrayer, WEEK_STEPS.fathersPath, WEEK_STEPS.nicaea, WEEK_STEPS.creed, WEEK_STEPS.leo, WEEK_STEPS.firstLiturgy, WEEK_STEPS.parish];
const week = (over: Partial<WeekDay>): WeekDay => ({ road: "catholic", steps, waiting: null, kept: null, ...over });
const src = (path: string) => readFileSync(path, "utf8");
const flat = (path: string) => src(path).replace(/\s+/g, " ");

describe("which of the reader's days a page is", () => {
  it("is today's step on the page that step opens, whatever its last slash", () => {
    expect(dayOfPage(week({ waiting: 0 }), "/prayers/learning/jesus-prayer/")).toEqual({ index: 0, kept: false, tomorrow: steps[1] });
    expect(dayOfPage(week({ waiting: 2 }), "/councils/first-nicaea")).toEqual({ index: 2, kept: false, tomorrow: steps[3] });
  });

  it("is the day kept today on its own page, so the card that closed the day is still there", () => {
    expect(dayOfPage(week({ kept: 0 }), "/prayers/learning/jesus-prayer")).toEqual({ index: 0, kept: true, tomorrow: steps[1] });
  });

  it("is no day on any other page: no page is framed for a reader whose day it is not", () => {
    expect(dayOfPage(week({ waiting: 0 }), "/councils/first-nicaea")).toBeNull();
    expect(dayOfPage(week({ waiting: 0 }), "/")).toBeNull();
    expect(dayOfPage(week({}), "/prayers/learning/jesus-prayer")).toBeNull();
  });

  it("is nothing without the frame, or with no address yet", () => {
    expect(dayOfPage(null, "/prayers/learning/jesus-prayer")).toBeNull();
    expect(dayOfPage(week({ waiting: 0 }), null)).toBeNull();
  });

  it("has no tomorrow on the seventh day", () => {
    expect(dayOfPage(week({ waiting: 6 }), "/parishes")).toEqual({ index: 6, kept: false, tomorrow: null });
  });
});

describe("the frame", () => {
  const frame = flat("components/onboarding/DayFrame.tsx");

  it("is off for readers: it ships with 2.0, as one part of the new first week", () => {
    expect(DAY_FRAME_LIVE).toBe(false);
  });

  it("is mounted once, in the frame around every page: the mark before the page and Done after it", () => {
    const app = flat("components/layout/AppFrame.tsx");
    expect(app.split("<DayMark />").length - 1).toBe(1);
    expect(app.split("<DayEnd />").length - 1).toBe(1);
    expect(app).toContain("<DayMark /> {children} <DayEnd />");
  });

  it("keeps a day only at the reader's own Done, and answers it in the house's motion", () => {
    // The one place a step is written as kept with the frame on: Done's own handler.
    expect(frame.split("stepTaken(").length - 1).toBe(1);
    expect(frame).toContain("movePage(() => writeWeek(stepTaken(readWeek(), localDay(new Date()))));");
    expect(frame).toContain('countWeekStep(here.index + 1, "kept");');
  });

  it("stands at the end of the page and never over it: nothing of it is fixed or sticky", () => {
    expect(frame).not.toMatch(/\b(fixed|sticky)\b(?![^"]*\*\/)/);
  });

  it("draws nothing for a reader without the frame: both parts wait on the one answer", () => {
    expect(frame.split("if (!here) return null;").length - 1).toBe(2);
    const hook = flat("lib/onboarding/useWeek.ts");
    expect(hook).toContain("dayFrameEnabled() ? \"1\" : \"\"");
    expect(hook).toContain("useSyncExternalStore(subscribe, daySnapshot, () => \"|\")");
  });

  it("says its four lines in the app's own words file", () => {
    const words = en as Record<string, string>;
    expect(words["onboard.week.done"]).toBe("Done for today");
    expect(words["onboard.week.kept"]).toBe("Day {n} of 7, kept");
    expect(words["onboard.week.tomorrow"]).toBe("Tomorrow: {title}");
    expect(words["onboard.week.back"]).toBe("Back to Today");
    for (const key of ["onboard.week.done", "onboard.week.kept", "onboard.week.tomorrow", "onboard.week.back", "onboard.week.eyebrow"]) expect(frame, key).toContain(`"${key}"`);
  });

  it("wears the week's own card once the day is kept, as Today draws it", () => {
    const card = "lm-card relative overflow-hidden rounded-[22px] p-5 ring-1 ring-inset ring-premium/30 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]";
    expect(frame).toContain(card);
    expect(flat("components/onboarding/FirstStepsNudge.tsx")).toContain(card.replace("relative overflow-hidden", "relative mb-4 overflow-hidden"));
  });
});
