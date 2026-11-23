import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import { dayOfPage } from "@/components/onboarding/DayFrame";

import { FRAMED_STEPS, PAGE_OF, frameFits } from "../dayFrame";
import { DAY_FRAME_LIVE } from "../flags";
import type { WeekDay } from "../useWeek";
import { WEEK_STEPS, type WeekStepKey } from "../week";

/**
 * The day's frame (2.0; docs/plans/onboarding-2.0.md, row 3). The owner,
 * 2026-11-22: "I want each day of the path actually worked on. right now it's
 * just acts as a hyperlink to a page", a day kept by "tapping done"; and his
 * yes of 2026-11-23 to "Done for today" at the end of the day's page, never
 * floating over it. What it must hold is here.
 */

const steps = [WEEK_STEPS.jesusPrayer, WEEK_STEPS.fathersPath, WEEK_STEPS.nicaea, WEEK_STEPS.creed, WEEK_STEPS.leo, WEEK_STEPS.firstLiturgy, WEEK_STEPS.schism];
const week = (over: Partial<WeekDay>): WeekDay => ({ road: "catholic", steps, waiting: null, kept: null, ...over });
const src = (path: string) => readFileSync(path, "utf8");
const flat = (path: string) => src(path).replace(/\s+/g, " ");
/** Every .tsx file under these folders. */
const filesUnder = (roots: readonly string[]): string[] =>
  roots.flatMap((root) =>
    readdirSync(root, { withFileTypes: true, recursive: true })
      .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
      .map((e) => join(e.parentPath, e.name)),
  );

describe("which of the reader's days a page is", () => {
  it("is today's step on the page that step opens, whatever its last slash", () => {
    expect(dayOfPage(week({ waiting: 2 }), "/councils/first-nicaea/")).toEqual({ index: 2, kept: false, tomorrow: steps[3] });
    expect(dayOfPage(week({ waiting: 4 }), "/saints/leo-the-great")).toEqual({ index: 4, kept: false, tomorrow: steps[5] });
  });

  it("is the day kept today on its own page, so the card that closed the day is still there", () => {
    expect(dayOfPage(week({ kept: 2 }), "/councils/first-nicaea")).toEqual({ index: 2, kept: true, tomorrow: steps[3] });
  });

  it("is no day on any other page: no page is framed for a reader whose day it is not", () => {
    expect(dayOfPage(week({ waiting: 2 }), "/saints/leo-the-great")).toBeNull();
    expect(dayOfPage(week({ waiting: 2 }), "/")).toBeNull();
    expect(dayOfPage(week({}), "/councils/first-nicaea")).toBeNull();
  });

  it("is nothing without the frame, or with no address yet", () => {
    expect(dayOfPage(null, "/councils/first-nicaea")).toBeNull();
    expect(dayOfPage(week({ waiting: 2 }), null)).toBeNull();
  });

  it("has no tomorrow on the seventh day", () => {
    expect(dayOfPage(week({ waiting: 6 }), "/history/great-schism-1054")).toEqual({ index: 6, kept: false, tomorrow: null });
  });

  it("is no framed day on a page the frame does not serve yet: a lesson, a path, a prayer, the guide", () => {
    expect(dayOfPage(week({ waiting: 0 }), "/prayers/learning/jesus-prayer")).toBeNull();
    expect(dayOfPage(week({ waiting: 1 }), "/reading/paths/start")).toBeNull();
    expect(dayOfPage(week({ waiting: 3 }), "/prayers/creed")).toBeNull();
    expect(dayOfPage(week({ kept: 3 }), "/prayers/creed")).toBeNull();
    expect(dayOfPage(week({ waiting: 5 }), "/start/first-liturgy")).toBeNull();
  });
});

describe("which steps the frame serves", () => {
  it("serves a council, a saint and a moment in history, and nothing else yet", () => {
    const fits = (Object.keys(WEEK_STEPS) as WeekStepKey[]).filter(frameFits).map((k) => WEEK_STEPS[k].href).sort();
    expect(fits).toEqual([
      "/councils/carthage-419",
      "/councils/chalcedon",
      "/councils/ephesus",
      "/councils/first-nicaea",
      "/history/great-schism-1054",
      "/history/non-chalcedonian-estrangement",
      "/saints/ignatius-of-antioch",
      "/saints/leo-the-great",
      "/saints/mary-of-egypt",
    ]);
  });

  it("names only steps a week can hold, each once", () => {
    for (const key of FRAMED_STEPS) expect(WEEK_STEPS[key], key).toBeDefined();
    expect(new Set(FRAMED_STEPS).size).toBe(FRAMED_STEPS.length);
  });

  it("leaves every other step as it was: a lesson, a chapter, a prayer with its own end, the guide, a section's front, a path", () => {
    for (const key of ["jesusPrayer", "morningRule", "gospelJohn", "psalter", "creed", "beforeSleep", "firstLiturgy", "parish", "councils", "history", "churchYear", "fathersPath", "readings", "yourRule", "startHere", "morningPrayers"] as const) {
      expect(frameFits(key), key).toBe(false);
    }
  });
});

describe("the frame", () => {
  const frame = flat("components/onboarding/DayFrame.tsx");

  it("is off for readers: it ships with 2.0, as one part of the new first week", () => {
    expect(DAY_FRAME_LIVE).toBe(false);
  });

  it("is mounted by each kind of page it serves, once, at the end of the page's own column", () => {
    // Every framed step's page has a file that mounts the end, so a step named with no mount is not served by accident.
    for (const key of FRAMED_STEPS) {
      const kind = WEEK_STEPS[key].href.split("/")[1];
      expect(PAGE_OF[kind], `${key} opens ${WEEK_STEPS[key].href}`).toBeDefined();
    }
    for (const [kind, file] of Object.entries(PAGE_OF)) {
      const page = flat(file);
      expect(page.split("<DayEnd ").length - 1, file).toBe(1);
      expect(FRAMED_STEPS.some((key) => WEEK_STEPS[key].href.split("/")[1] === kind), kind).toBe(true);
    }
    // After the council's article, whose own foot is the read-to-end mark and the moment a palette is earned.
    expect(flat(PAGE_OF.councils)).toContain('<EarnedMoment palette="councils" /> </article> {/* When this council is today\'s step');
    expect(flat(PAGE_OF.councils)).toContain('<DayEnd className="mx-auto mt-12 w-full max-w-[820px]" /> </section>');
    expect(flat(PAGE_OF.history)).toContain('<DayEnd className="mt-12" /> </div> </section>');
    expect(flat(PAGE_OF.saints)).toContain('<DayEnd className="mt-8 pb-16" /> </div> </SaintInReadersLanguage>');
  });

  it("is mounted nowhere else: not in the app's shell, where it would be drawn over a page that has not come", () => {
    expect(flat("components/layout/AppFrame.tsx")).not.toContain("DayFrame");
    const mounts = filesUnder(["app", "components"]).filter((f) => /<DayEnd[\s/>]/.test(readFileSync(f, "utf8")));
    expect(mounts.sort()).toEqual(Object.values(PAGE_OF).sort());
  });

  it("says the week's line once, with the button, and never over the page's head", () => {
    expect(frame).not.toContain("DayMark");
    expect(frame.split('"onboard.week.eyebrow"').length - 1).toBe(1);
    expect(frame).toContain('<p data-day-mark="" className="font-sans text-caption font-semibold text-paper/65"> {t("onboard.week.eyebrow", { n: here.index + 1 })} </p> <button');
  });

  it("takes the page with the card in the one move, after the reader's own Done and only then", () => {
    expect(frame).toContain("answered.current = true;");
    // In the move's own change (a layout effect), at once: never a second motion after it.
    expect(frame).toContain("useLayoutEffect(() => { if (!kept || !answered.current) return; answered.current = false;");
    expect(frame).toContain("if (shiftToReadingPlace(band, el.getBoundingClientRect()) > 1) goToReadingPlace(el, { smooth: false, band });");
    expect(frame).not.toContain("afterMoves");
  });

  it("keeps a day only at the reader's own Done, and answers it in the house's motion", () => {
    // The one place a step is written as kept with the frame on: Done's own handler.
    expect(frame.split("stepTaken(").length - 1).toBe(1);
    expect(frame).toContain("movePage(() => writeWeek(stepTaken(readWeek(), localDay(new Date()))), { grows: [block.current], glides: piecesBefore(block.current) });");
    expect(frame).toContain('countWeekStep(here.index + 1, "kept");');
  });

  it("stands at the end of the page and never over it: nothing of it is fixed or sticky", () => {
    expect(frame).not.toMatch(/\b(fixed|sticky)\b(?![^"]*\*\/)/);
  });

  it("draws nothing for a reader without the frame, or on a page that is not their day's", () => {
    expect(frame.split("if (!here) return null;").length - 1).toBe(1);
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
