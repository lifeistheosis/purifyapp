// Which days the day's frame serves (2.0; ./flags.ts, DAY_FRAME_LIVE; the
// frame itself is components/onboarding/DayFrame.tsx).
//
// The frame puts "Done for today" at the end of the day's page, so it fits a
// page that is one thing with an end and has no end of its own. The end of
// each of the twenty-eight pages a first week opens was walked on the export
// on 2026-11-23 (docs/plans/onboarding-2.0.md, "what stands at the end of
// each page"), and the frame's own probe and a reading of each page's code
// took two more kinds out. The others, and why:
//
//   a list or a hub         no one thing and no end (a section's front page,
//                           Find a parish, a path, Today's readings, Your
//                           rule, the morning's rule with its own marks).
//
// Each of these is a slice of its own. Until it is built, such a day is as
// it was with the frame off: taken when it is opened, with no Done, so no
// reader with the frame is left on a day that cannot be kept.
//
// A lesson is served too, another way round (the owner's "keep going" of
// 2026-11-23, to "the lesson's Next lesson button gives way to Done for
// today"). Its own end holds one white button, "Next lesson", which leads
// away from the week. So on the reader's day the lesson's end itself gives
// way (components/prayers/LessonEnd.tsx): the frame's end stands where that
// button stood, the way on to the next lesson stays as a quiet link, as the
// way back already was, and the lesson's own "Lesson read" is left unsaid,
// since the day's end says it. For every other reader the lesson is as it
// was.
//
// A prayer is kept another way (the owner's yes of 2026-11-23, to "on a
// prayer day, should finishing the prayer keep the day by itself, with no
// extra button"). It has an end of its own: each prayer is marked as the
// reader moves down through it, and the rule's own finish answers the last
// (components/prayers/PrayerRuleReader.tsx, service/RuleEnd.tsx). A second
// Done under it would say one thing twice. So on a prayer's day that end
// keeps the day (OWN_END_STEPS), and nothing of the week is drawn on the
// prayer's page at all: no retention loops inside prayers (his word of
// 2026-10-16). Today says the day is kept when the reader is back.
//
// A chapter and the first Liturgy's guide are kept the same way (his yes of
// 2026-11-23, to "for Bible chapters and the Liturgy guide, should reaching
// the end keep the day by itself, with nothing extra drawn"). The Bible's
// reader floats its own bars over the page and opens the next chapter when
// its end is reached, so a button at that end would stand under them and on
// the way into another chapter: the day is kept when the chapter's last
// verse has stood on the screen a moment (DayKeptAt, at the end of the
// verses). The guide is a flow of its own with its own finish, the page that
// keeps the reader's checklist and day (lib/start/liturgyPlan.ts, done):
// reaching it keeps the day.
//
// Days that open a list are kept by the list's own act (his "do all" of
// 2026-11-23, to one pick for each): a path of the Fathers by its own "Mark
// as read", Find a parish by a finder opened, Your rule by the reader's own
// rule said through. Each of those acts was in the page already; the week
// only hears it.
//
// What is left as it was, taken when it is opened: a section's front page a
// reader's own first pick opens (the saints, the councils, the Church's
// history, Start here, What the Orthodox believe, the reading paths' list),
// and the two days that belong to the calendar's own day, today's readings
// and the Church's year, which are the next pass.
//
// A step is served when it is named here AND its page mounts the frame's end
// (PAGE_OF below says which file, by where the page's address begins): the
// end stands inside the page, in the page's own column and under its own
// loading state, so it is never drawn over an outline of a page that has not
// come. A test holds the two together (./__tests__/dayFrame.test.ts), so a
// new step has to be placed.

import type { WeekStepKey } from "./week";

/** The steps whose page the frame serves today: a council, a saint, a moment in history, a lesson of Learn to pray. */
export const FRAMED_STEPS: readonly WeekStepKey[] = [
  "nicaea",
  "ephesus",
  "chalcedon",
  "carthage",
  "leo",
  "ignatius",
  "maryOfEgypt",
  "schism",
  "afterChalcedon",
  "pentecost",
  "whatIsPrayer",
  "jesusPrayer",
  "trisagion",
  "signOfCross",
  "morningRule",
];

/** The file that draws the end of each kind of framed page, by where its address begins: where `<DayEnd />` is mounted. */
export const PAGE_OF: Readonly<Record<string, string>> = {
  "/councils/": "app/(app)/councils/[slug]/page.tsx",
  "/saints/": "app/(app)/saints/[slug]/page.tsx",
  "/history/": "app/(app)/history/[slug]/page.tsx",
  "/prayers/learning/": "components/prayers/LessonEnd.tsx",
};

/** Where a framed page's address begins, as PAGE_OF names it, or null. */
export function kindOf(href: string): string | null {
  return Object.keys(PAGE_OF).find((start) => href.startsWith(start)) ?? null;
}

/** Whether this step's page is one the frame serves today. */
export function frameFits(key: WeekStepKey): boolean {
  return FRAMED_STEPS.includes(key);
}

const PRAYER = "components/prayers/PrayerRuleReader.tsx";
const CHAPTER = "components/bible/ChapterScreen.tsx";
const PATH = "components/reading/PathView.tsx";

/**
 * The steps kept by an end, or an act, of their own, and the file in which each is told to the
 * week. A prayer said through; a chapter read to its end; the first Liturgy's guide finished; and,
 * by his "do all" of 2026-11-23, days that open a list, each kept by the list's own act: a path of
 * the Fathers by its own "Mark as read", Find a parish by a finder opened, Your rule by the
 * reader's own rule said through. Nothing of the week is drawn on any of them.
 */
export const OWN_END_IN: Readonly<Partial<Record<WeekStepKey, string>>> = {
  creed: PRAYER,
  beforeSleep: PRAYER,
  morningPrayers: PRAYER,
  gospelJohn: CHAPTER,
  job: CHAPTER,
  psalter: CHAPTER,
  firstLiturgy: "components/start/liturgy/FirstLiturgyGuide.tsx",
  fathersPath: PATH,
  prayFathers: PATH,
  parish: "components/parishes/ParishFinderList.tsx",
  // The page the step opens is the builder; the rule is said on its own page, under it.
  yourRule: "components/prayers/mine/MyRuleReader.tsx",
};

/** The steps whose day is kept by their own end or act. */
export const OWN_END_STEPS = Object.keys(OWN_END_IN) as readonly WeekStepKey[];

/** Whether this step's day is kept by its page's own end. */
export function ownEnd(key: WeekStepKey): boolean {
  return OWN_END_STEPS.includes(key);
}

/** Whether this step's day is kept on its page, by Done or by the page's own end, and so not when it is opened. */
export function keptOnPage(key: WeekStepKey): boolean {
  return frameFits(key) || ownEnd(key);
}
