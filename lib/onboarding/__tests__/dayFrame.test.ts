import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import en from "@/lib/i18n/messages/en.json";
import { dayOfPage } from "@/components/onboarding/DayFrame";

import { FRAMED_STEPS, OWN_END_IN, OWN_END_STEPS, PAGE_OF, frameFits, keptOnPage, kindOf, ownEnd } from "../dayFrame";
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

  it("is a lesson's day on the lesson's own page", () => {
    expect(dayOfPage(week({ waiting: 0 }), "/prayers/learning/jesus-prayer/")).toEqual({ index: 0, kept: false, tomorrow: steps[1] });
    expect(dayOfPage(week({ kept: 0 }), "/prayers/learning/jesus-prayer")).toEqual({ index: 0, kept: true, tomorrow: steps[1] });
    // Another lesson, read on the same day, is no one's day.
    expect(dayOfPage(week({ waiting: 0 }), "/prayers/learning/what-is-prayer")).toBeNull();
  });

  it("is no framed day, with Done at its end, on a page kept by an end of its own: a path, a prayer, the guide", () => {
    expect(dayOfPage(week({ waiting: 1 }), "/reading/paths/start")).toBeNull();
    expect(dayOfPage(week({ waiting: 3 }), "/prayers/creed")).toBeNull();
    expect(dayOfPage(week({ kept: 3 }), "/prayers/creed")).toBeNull();
    expect(dayOfPage(week({ waiting: 5 }), "/start/first-liturgy")).toBeNull();
  });
});

describe("which steps the frame serves", () => {
  it("serves a council, a saint, a moment in history and a lesson of Learn to pray, and nothing else yet", () => {
    const fits = (Object.keys(WEEK_STEPS) as WeekStepKey[]).filter(frameFits).map((k) => WEEK_STEPS[k].href).sort();
    expect(fits).toEqual([
      "/councils/carthage-419",
      "/councils/chalcedon",
      "/councils/ephesus",
      "/councils/first-nicaea",
      "/history/great-schism-1054",
      "/history/non-chalcedonian-estrangement",
      "/history/pentecost",
      "/prayers/learning/jesus-prayer",
      "/prayers/learning/morning-rule",
      "/prayers/learning/sign-of-the-cross",
      "/prayers/learning/trisagion-prayers",
      "/prayers/learning/what-is-prayer",
      "/saints/ignatius-of-antioch",
      "/saints/leo-the-great",
      "/saints/mary-of-egypt",
    ]);
  });

  it("names only steps a week can hold, each once", () => {
    for (const key of FRAMED_STEPS) expect(WEEK_STEPS[key], key).toBeDefined();
    expect(new Set(FRAMED_STEPS).size).toBe(FRAMED_STEPS.length);
  });

  it("never puts Done on a page with an end of its own, or on a list or a hub", () => {
    for (const key of ["gospelJohn", "job", "psalter", "creed", "beforeSleep", "firstLiturgy", "parish", "councils", "history", "churchYear", "feasts", "fathersPath", "prayFathers", "readings", "yourRule", "startHere", "theology", "saintsLives", "readingPaths", "morningPrayers"] as const) {
      expect(frameFits(key), key).toBe(false);
    }
  });

  it("by its key alone leaves, taken when they are opened, only a section's front page and the calendar's own two days, which the day itself leads into (dayStep.test.ts)", () => {
    const open = (Object.keys(WEEK_STEPS) as WeekStepKey[]).filter((k) => !keptOnPage(k)).map((k) => WEEK_STEPS[k].href).sort();
    expect(open).toEqual(["/calendar", "/calendar", "/councils", "/history", "/prayers/today", "/reading/paths", "/saints", "/start", "/theology"]);
  });
});

describe("the frame", () => {
  const frame = flat("components/onboarding/DayFrame.tsx");

  it("is off for readers: it ships with 2.0, as one part of the new first week", () => {
    expect(DAY_FRAME_LIVE).toBe(false);
  });

  it("is mounted by each kind of page it serves, once, at the end of the page's own column", () => {
    // Every framed step's page has a file that mounts the end, so a step named with no mount is not served by accident.
    for (const key of FRAMED_STEPS) expect(kindOf(WEEK_STEPS[key].href), `${key} opens ${WEEK_STEPS[key].href}`).not.toBeNull();
    for (const [kind, file] of Object.entries(PAGE_OF)) {
      const page = flat(file);
      expect(page.split("<DayEnd ").length - 1, file).toBe(1);
      expect(FRAMED_STEPS.some((key) => kindOf(WEEK_STEPS[key].href) === kind), kind).toBe(true);
    }
    // After the council's article, whose own foot is the read-to-end mark and the moment a palette is earned.
    expect(flat(PAGE_OF["/councils/"])).toContain('<EarnedMoment palette="councils" /> </article> {/* When this council is today\'s step');
    expect(flat(PAGE_OF["/councils/"])).toContain('<DayEnd className="mx-auto mt-12 w-full max-w-[820px]" /> </section>');
    expect(flat(PAGE_OF["/history/"])).toContain('<DayEnd className="mt-12" /> </div> </section>');
    expect(flat(PAGE_OF["/saints/"])).toContain('<DayEnd className="mt-8 pb-16" /> </div> </SaintInReadersLanguage>');
    // Only an address that begins as a framed page's does is one: a prayer and a lessons' list are not.
    expect(kindOf("/prayers/creed")).toBeNull();
    expect(kindOf("/prayers/learning/jesus-prayer")).toBe("/prayers/learning/");
    expect(kindOf("/councils")).toBeNull();
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
    // Done's own handler keeps the day, inside the move; nothing else in the frame writes a week.
    expect(frame).toContain("movePage(() => void keepDay(here.index), { grows: [el], glides: [...piecesBefore(el), ...partsAfter(el), ...stuckOver(el)] });");
    expect(frame).not.toContain("writeWeek(");
    expect(frame).not.toContain("stepTaken(");
    // Four places in the frame keep a day, each by keepDay: Done, an end a page tells, an end that is a place, an act that is a tap.
    expect(frame.split("keepDay(").length - 1).toBe(4);
    // And it is kept once: the step is taken only while it is still the one waiting, and counted there.
    const keep = flat("lib/onboarding/keepDay.ts");
    expect(keep).toContain('if (stepToday(week, today) !== index) return false; writeWeek(stepTaken(week, today)); countWeekStep(index + 1, "kept"); return true;');
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

  it("says its three new lines in the app's own words file, and the way back in words the app already had", () => {
    const words = en as Record<string, string>;
    expect(words["onboard.week.done"]).toBe("Done for today");
    expect(words["onboard.week.kept"]).toBe("Day {n} of 7, kept");
    expect(words["onboard.week.tomorrow"]).toBe("Tomorrow: {title}");
    // "Back to Today" was the Catechism's already, in every language: no second key for the same words.
    expect(words["catechism.backToToday"]).toBe("Back to Today");
    expect(words["onboard.week.back"]).toBeUndefined();
    for (const key of ["onboard.week.done", "onboard.week.kept", "onboard.week.tomorrow", "catechism.backToToday", "onboard.week.eyebrow"]) expect(frame, key).toContain(`"${key}"`);
  });

  it("says them in every language the app speaks, each with the same blanks to fill", () => {
    const blanks = (v: string) => (v.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort().join(",");
    const english = en as Record<string, string>;
    const files = readdirSync("lib/i18n/messages").filter((f) => f.endsWith(".json") && f !== "en.json");
    expect(files).toHaveLength(20);
    for (const file of files) {
      const words = JSON.parse(src(join("lib/i18n/messages", file))) as Record<string, string>;
      for (const key of ["onboard.week.done", "onboard.week.kept", "onboard.week.tomorrow", "catechism.backToToday", "onboard.week.eyebrow"]) {
        expect(words[key], `${file} ${key}`).toBeTruthy();
        expect(words[key], `${file} ${key}`).not.toBe(english[key]);
        expect(blanks(words[key]), `${file} ${key}`).toBe(blanks(english[key]));
        expect(words[key], `${file} ${key}`).not.toContain("\u2014");
      }
    }
  });

  it("wears the week's own card once the day is kept, as Today draws it", () => {
    const card = "lm-card relative overflow-hidden rounded-[22px] p-5 ring-1 ring-inset ring-premium/30 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]";
    expect(frame).toContain(card);
    expect(flat("components/onboarding/FirstStepsNudge.tsx")).toContain(card.replace("relative overflow-hidden", "relative mb-4 overflow-hidden"));
  });
});

describe("a day kept by its page's own end or act", () => {
  const frame = flat("components/onboarding/DayFrame.tsx");
  const PRAYER = "components/prayers/PrayerRuleReader.tsx";
  const reader = flat(PRAYER);

  it("is a prayer said through, a chapter read to its end, the guide finished, and three lists by their own act", () => {
    expect(OWN_END_STEPS.map((k) => WEEK_STEPS[k].href).sort()).toEqual([
      "/bible/job/1",
      "/bible/john/1",
      "/bible/psalms/1",
      "/parishes",
      "/prayers/before-sleep",
      "/prayers/creed",
      "/prayers/morning",
      "/prayers/personal",
      "/reading/paths/prayer",
      "/reading/paths/start",
      "/start/first-liturgy",
    ]);
    for (const key of OWN_END_STEPS) {
      expect(ownEnd(key), key).toBe(true);
      // Never by Done as well: one thing is not said twice on a page.
      expect(frameFits(key), key).toBe(false);
      expect(keptOnPage(key), key).toBe(true);
    }
    for (const key of FRAMED_STEPS) expect(ownEnd(key), key).toBe(false);
    // A lesson about praying is a lesson, not a prayer said through: it is kept by Done, never by its own end.
    for (const key of ["jesusPrayer", "morningRule", "trisagion", "signOfCross", "whatIsPrayer"] as const) {
      expect(ownEnd(key), key).toBe(false);
      expect(frameFits(key), key).toBe(true);
    }
    // A section's front page is kept nowhere, taken when it is opened; and so, by their key alone, are the calendar's two days.
    for (const key of ["churchYear", "feasts", "readings", "councils", "history", "startHere", "theology", "saintsLives", "readingPaths"] as const) expect(keptOnPage(key), key).toBe(false);
  });

  it("each one's end is told in the file it names, and in no other", () => {
    const by = (tag: string) => filesUnder(["app", "components"]).filter((f) => new RegExp(`<${tag}[\\s/>]`).test(readFileSync(f, "utf8"))).sort();
    const files = (keys: readonly WeekStepKey[]) => [...new Set(keys.map((k) => OWN_END_IN[k]!))].sort();
    // A told end: a prayer's (the reader's own rule among them, through the same reader), the guide's, a path's.
    expect(by("DayKeptBy")).toEqual(files(["creed", "firstLiturgy", "fathersPath"]));
    // An end that is a place: a chapter's last verse.
    expect(by("DayKeptAt")).toEqual(files(["gospelJohn"]));
    // An act that is a tap: a parish finder opened.
    expect(by("DayKeptOnTap")).toEqual(files(["parish"]));
    for (const key of OWN_END_STEPS) expect(OWN_END_IN[key], key).toBeTruthy();
  });

  it("a prayer's end is told in the one prayer reader: the rule complete today", () => {
    for (const file of ["app/(app)/prayers/[planId]/page.tsx", "app/(app)/prayers/morning/page.tsx"]) expect(flat(file), file).toMatch(/RuleInReadersLanguage|PrayerRuleReader/);
    expect(flat("components/prayers/RuleInReadersLanguage.tsx")).toContain("<PrayerRuleReader");
    expect(reader.split("<DayKeptBy ").length - 1).toBe(1);
    expect(reader).toContain("<DayKeptBy done={kept} step={dayStep} />");
    expect(reader).toContain("const kept = useSyncExternalStore(subscribe, () => isKept(rule.id), () => false);");
  });

  it("Your rule opens the builder, and is kept where the reader's own rule is said, under it", () => {
    expect(WEEK_STEPS.yourRule.href).toBe("/prayers/personal");
    const mine = flat(OWN_END_IN.yourRule!);
    expect(mine).toContain('dayStep="yourRule"');
    expect(mine).toContain("<PrayerRuleReader");
    // By the step's name, since the page is not the one the step opens.
    expect(frame).toContain("const named = step && day && day.waiting != null && day.steps[day.waiting]?.key === step ? day.waiting : null;");
    expect(frame).toContain("const waiting = step ? named : here && !here.kept ? here.index : null;");
  });

  it("the guide's end is its own finish: the page that keeps the reader's checklist and day", () => {
    const guide = flat(OWN_END_IN.firstLiturgy!);
    expect(guide.split("<DayKeptBy ").length - 1).toBe(1);
    expect(guide).toContain("<DayKeptBy done={mounted && plan.done} />");
    expect(flat("lib/start/liturgyPlan.ts")).toContain('done: p.done || step === "ready",');
  });

  it("a path of the Fathers is kept by its own Mark as read, made in this visit", () => {
    const path = flat(OWN_END_IN.fathersPath!);
    expect(OWN_END_IN.prayFathers).toBe(OWN_END_IN.fathersPath);
    expect(path).toContain("const [marked, setMarked] = useState(false);");
    expect(path).toContain("const wasRead = done.includes(i); if (!wasRead) setMarked(true);");
    expect(path).toContain("<DayKeptBy done={marked} />");
  });

  it("Find a parish is kept as the reader opens a finder or the way to the guide", () => {
    const list = flat(OWN_END_IN.parish!);
    expect(list).toContain('<DayKeptOnTap on="[data-parish-finder], [data-parish-guide]" />');
    expect(list).toContain('href={f.url} data-parish-finder=""');
    expect(list).toContain('href="/start/first-liturgy" data-parish-guide=""');
    const island = frame.slice(frame.indexOf("export function DayKeptOnTap("), frame.indexOf("/** How long a page's end stands"));
    // Heard on its way down, before the page it opens takes the screen.
    expect(island).toContain('document.addEventListener("click", heard, true);');
    expect(island).toContain("if (event.target instanceof Element && event.target.closest(on)) keepDay(waiting);");
    expect(island).toContain("return null; }");
  });

  it("a chapter's end is a place: a mark after its last verse, before the way on to the next chapter", () => {
    const screen = flat(OWN_END_IN.gospelJohn!);
    for (const key of ["job", "psalter"] as const) expect(OWN_END_IN[key]).toBe(OWN_END_IN.gospelJohn);
    expect(screen.split("<DayKeptAt ").length - 1).toBe(1);
    expect(screen.indexOf("<DayKeptAt />")).toBeGreaterThan(screen.indexOf("book={slug} chapter={chapter} /> : reader}"));
    expect(screen.indexOf("<DayKeptAt />")).toBeLessThan(screen.indexOf("<ChapterPager slug={slug}"));
    expect(screen.indexOf("<DayKeptAt />")).toBeLessThan(screen.indexOf("<KeepScrolling slug={slug}"));
  });

  it("the mark keeps the day only once the end has stood on the screen a moment, over the bars, while the page is seen", () => {
    const island = frame.slice(frame.indexOf("export function DayKeptAt("));
    expect(frame).toContain("export const KEPT_AFTER_MS = 2000;");
    expect(island).toContain('if (entry.isIntersecting && document.visibilityState === "visible") timer = window.setTimeout(() => keepDay(waiting), KEPT_AFTER_MS);');
    expect(island).toContain('{ rootMargin: "0px 0px -15% 0px" }');
    // Passing it on the way somewhere else keeps nothing: the wait is called off as it leaves.
    expect(island).toContain("window.clearTimeout(timer); if (entry.isIntersecting");
    // And it is not in the page at all on any day but the reader's own.
    expect(island).toContain("if (waiting == null) return null;");
    expect(island).toContain('<span ref={mark} aria-hidden data-day-own-end="" className="block h-px w-full" />');
  });

  it("is that day only on its own page, while it waits", () => {
    expect(dayOfPage(week({ waiting: 3 }), "/prayers/creed", ownEnd)).toEqual({ index: 3, kept: false, tomorrow: steps[4] });
    expect(dayOfPage(week({ waiting: 5 }), "/start/first-liturgy/", ownEnd)).toEqual({ index: 5, kept: false, tomorrow: steps[6] });
    expect(dayOfPage(week({ waiting: 1 }), "/reading/paths/start", ownEnd)).toEqual({ index: 1, kept: false, tomorrow: steps[2] });
    expect(dayOfPage(week({ waiting: 3 }), "/prayers/before-sleep", ownEnd)).toBeNull();
    expect(dayOfPage(week({ waiting: 2 }), "/councils/first-nicaea", ownEnd)).toBeNull();
    expect(frame).toContain("if (done && waiting != null) keepDay(waiting);");
  });

  it("draws nothing a reader sees: no retention loops inside prayers, and nothing over a chapter, the guide or a list", () => {
    const by = frame.slice(frame.indexOf("export function DayKeptBy("), frame.indexOf("export function DayKeptOnTap("));
    expect(by).toContain("return null; }");
    expect(by.slice(by.indexOf("{ done, step }"))).not.toMatch(/<[A-Z][A-Za-z]*[\s/>]/);
    // Never the week's end or its words where an end of its own is told.
    for (const file of new Set(Object.values(OWN_END_IN))) {
      expect(flat(file!), file).not.toContain("<DayEnd");
      expect(flat(file!), file).not.toContain("onboard.week.");
    }
  });
});

describe("a lesson's day", () => {
  const end = flat(PAGE_OF["/prayers/learning/"]);

  it("the lesson's own end gives way: the frame's end stands where its one white button stood", () => {
    expect(end).toContain("const day = useDayHere();");
    expect(end).toContain('{day ? ( <> <DayEnd plain className="mb-2 w-full" />');
    // Inside the lesson's own end, which has its own line over it and its own room under it.
    const frame = flat("components/onboarding/DayFrame.tsx");
    expect(frame).toContain('<div ref={block} className={plain ? undefined : "border-t border-paper/10 pb-4 pt-6"}>');
    expect(frame).toContain("export function useDayHere(): boolean { return dayOfPage(useWeekDay(), usePathname()) !== null; }");
  });

  it("keeps the way on as a quiet link, like the way back: no second white button on the reader's day", () => {
    const quiet = 'const quiet = "tap-press inline-flex min-h-11 max-w-full items-center gap-1 font-sans text-detail text-paper/60 hover:text-paper";';
    expect(end).toContain(quiet);
    const days = end.slice(end.indexOf("{day ? ( <>"), end.indexOf(") : next ? ("));
    expect(days).toContain('<Link href={next ? `/prayers/learning/${next.id}` : "/prayers/personal"} data-lesson-on="" className={quiet}>');
    expect(days).not.toContain("bg-paper");
    // The way back wears the same quiet look, for every reader.
    expect(end).toContain("<Link href={`/prayers/learning/${prev.id}`} className={quiet}>");
    // And for every other reader the lesson's one action is as it was.
    expect(end.split("rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night").length - 1).toBe(2);
  });

  it("leaves Lesson read unsaid on that day, while the lesson is still marked read", () => {
    expect(end).toContain("{isRead && !day ? (");
    expect(end).toContain("timer = window.setTimeout(() => markLessonRead(id), READ_AFTER_MS);");
  });
});
