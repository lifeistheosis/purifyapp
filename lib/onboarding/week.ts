// The first week (1.9): seven steps for each road, in place of the one Day 1
// card. What it is for is docs/1.9-build/notes/onboarding-fable.md, 3.4.
//
// Every step is a page Purify already has, and says only that page's own
// name: a card's title is the page's title, and its line, where it has one,
// is a line the app already says about that page (the Day 1 lines, Start
// here's, the reading paths'). Nothing here frames or explains: a line that
// did would be editorial, and would wait in the queue
// (docs/editorial-standards.md).
//
// The order of a week is one shape for every road, the destination in small:
// something to read, something to understand, something to pray, somewhere
// to go. The roads differ. Outside the practicing they all end at the same
// door: a parish, or a first Liturgy.
//
// No step is a locked page. The first week of every road is free end to end,
// so the Gospels are John's first chapter here and not the reading plan,
// whose Begin opens the upgrade sheet (components/plans/PlanClient.tsx).
// lib/onboarding/__tests__/week.test.ts holds that, and holds every step to a
// page that exists.
//
// Pure. What the device keeps of a week is ./state.ts (readWeek, writeWeek).

import type { Lean, Road } from "./road";
import type { DayOneKey, Intent, Level } from "./space";

/** A step of a week: a Day 1 step the app already offered, or one of these. */
export type WeekStepKey =
  | Exclude<DayOneKey, "gospelsPlan">
  | "fathersPath"
  | "prayFathers"
  | "nicaea"
  | "ephesus"
  | "chalcedon"
  | "carthage"
  | "leo"
  | "ignatius"
  | "maryOfEgypt"
  | "schism"
  | "afterChalcedon"
  | "creed"
  | "parish"
  | "yourRule"
  | "readings"
  | "psalter"
  | "beforeSleep";

export type WeekStep = {
  key: WeekStepKey;
  href: string;
  /** The page's own name, as a catalogue key. */
  titleKey: string;
  /** A line the app already says about the page, where it has one. */
  bodyKey?: string;
};

const dayOne = (key: Exclude<DayOneKey, "gospelsPlan">, href: string): WeekStep => ({
  key,
  href,
  titleKey: `onboard.day1.${key}.title`,
  bodyKey: `onboard.day1.${key}.body`,
});

/** A page whose name the catalogue did not hold: its own title, written out once (onboard.week.<key>). */
const named = (key: WeekStepKey, href: string): WeekStep => ({ key, href, titleKey: `onboard.week.${key}` });

export const WEEK_STEPS: Readonly<Record<WeekStepKey, WeekStep>> = {
  // The Day 1 steps, each with the words it has always had.
  whatIsPrayer: dayOne("whatIsPrayer", "/prayers/learning/what-is-prayer"),
  jesusPrayer: dayOne("jesusPrayer", "/prayers/learning/jesus-prayer"),
  trisagion: dayOne("trisagion", "/prayers/learning/trisagion-prayers"),
  signOfCross: dayOne("signOfCross", "/prayers/learning/sign-of-the-cross"),
  firstLiturgy: dayOne("firstLiturgy", "/start/first-liturgy"),
  churchYear: dayOne("churchYear", "/calendar"),
  gospelJohn: dayOne("gospelJohn", "/bible/john/1"),
  job: dayOne("job", "/bible/job/1"),
  morningRule: dayOne("morningRule", "/prayers/learning/morning-rule"),
  morningPrayers: dayOne("morningPrayers", "/prayers/morning"),
  saintsLives: dayOne("saintsLives", "/saints"),
  readingPaths: dayOne("readingPaths", "/reading/paths"),
  councils: dayOne("councils", "/councils"),
  history: dayOne("history", "/history"),
  startHere: dayOne("startHere", "/start"),
  theology: dayOne("theology", "/theology"),
  feasts: dayOne("feasts", "/calendar"),
  // Pages whose own words the catalogue already holds.
  fathersPath: { key: "fathersPath", href: "/reading/paths/start", titleKey: "paths.start.name", bodyKey: "paths.start.body" },
  prayFathers: { key: "prayFathers", href: "/reading/paths/prayer", titleKey: "paths.prayer.name", bodyKey: "paths.prayer.body" },
  creed: { key: "creed", href: "/prayers/creed", titleKey: "prayers.rule.creed.title", bodyKey: "prayers.rule.creed.description" },
  parish: { key: "parish", href: "/parishes", titleKey: "start.step.parish.title", bodyKey: "start.step.parish.body" },
  yourRule: { key: "yourRule", href: "/prayers/personal", titleKey: "prayers.mine.title" },
  readings: { key: "readings", href: "/prayers/today", titleKey: "calendar.todaysReadings", bodyKey: "start.step.day.body" },
  psalter: { key: "psalter", href: "/bible/psalms/1", titleKey: "discover.tile.psalter", bodyKey: "discover.tile.psalterBlurb" },
  beforeSleep: {
    key: "beforeSleep",
    href: "/prayers/before-sleep",
    titleKey: "prayers.rule.before-sleep.title",
    bodyKey: "prayers.rule.before-sleep.description",
  },
  // A council, a saint, an event: the page's own name and nothing more.
  nicaea: named("nicaea", "/councils/first-nicaea"),
  ephesus: named("ephesus", "/councils/ephesus"),
  chalcedon: named("chalcedon", "/councils/chalcedon"),
  carthage: named("carthage", "/councils/carthage-419"),
  leo: named("leo", "/saints/leo-the-great"),
  ignatius: named("ignatius", "/saints/ignatius-of-antioch"),
  maryOfEgypt: named("maryOfEgypt", "/saints/mary-of-egypt"),
  schism: named("schism", "/history/great-schism-1054"),
  afterChalcedon: named("afterChalcedon", "/history/non-chalcedonian-estrangement"),
};

export const WEEK_LENGTH = 7;
type Seven = readonly [WeekStepKey, WeekStepKey, WeekStepKey, WeekStepKey, WeekStepKey, WeekStepKey, WeekStepKey];

/**
 * Each road's week, the proposal of the notes (3.4) for the owner to arrange.
 * A Protestant reader's week has two orders, by their lean (./road.ts).
 *
 * Left out on purpose: the studies on the filioque, the papacy, original sin,
 * theosis and the Theotokos. A Catholic's or a Protestant's road would lead to
 * them, and they are five of the seven that do not survive the provenance
 * audit (docs/editorial-standards.md, clergy queue item 5). The councils'
 * own pages and the history rewritten in 1.7 carry those days until they are
 * repaired.
 */
export const ROAD_WEEKS: Readonly<Record<Exclude<Road, "protestant">, Seven>> = {
  practicing: ["yourRule", "readings", "psalter", "churchYear", "prayFathers", "beforeSleep", "fathersPath"],
  returning: ["morningRule", "readings", "jesusPrayer", "churchYear", "beforeSleep", "creed", "parish"],
  catechumen: ["trisagion", "signOfCross", "firstLiturgy", "creed", "readings", "morningRule", "parish"],
  catholic: ["fathersPath", "nicaea", "leo", "jesusPrayer", "schism", "firstLiturgy", "parish"],
  christian: ["creed", "nicaea", "gospelJohn", "chalcedon", "afterChalcedon", "trisagion", "firstLiturgy"],
  seeker: ["ignatius", "history", "nicaea", "councils", "fathersPath", "trisagion", "firstLiturgy"],
  newcomer: ["startHere", "maryOfEgypt", "gospelJohn", "creed", "signOfCross", "churchYear", "firstLiturgy"],
};

export const PROTESTANT_WEEKS: Readonly<Record<Lean, Seven>> = {
  bible: ["gospelJohn", "ignatius", "nicaea", "whatIsPrayer", "carthage", "ephesus", "firstLiturgy"],
  liturgical: ["gospelJohn", "nicaea", "leo", "jesusPrayer", "carthage", "firstLiturgy", "parish"],
};

/**
 * The step an answer to "What are you looking for?" opens, inside a week.
 * The Day 1 step it always opened (./space.ts, dayOneFor), but for two: the
 * Gospels are John's first chapter, since the plan is locked, and for a
 * reader not yet practicing "What the Orthodox believe" is the Creed or
 * Start here, never the study library (see ROAD_WEEKS on why).
 */
export function pickStep(intent: Intent, level: Level | null): WeekStepKey {
  const beginner = level !== "practicing";
  switch (intent) {
    case "saints":
      return "saintsLives";
    case "fathers":
      return "fathersPath";
    case "gospels":
      return "gospelJohn";
    case "councils":
      return "councils";
    case "history":
      return "history";
    case "beliefs":
      return level === "practicing" ? "theology" : level === "learning" ? "creed" : "startHere";
    case "feasts":
      return "feasts";
    case "quiet":
      return "jesusPrayer";
    case "liturgy":
      return level === "practicing" ? "churchYear" : level === "learning" ? "trisagion" : "firstLiturgy";
    case "study":
      return beginner ? "gospelJohn" : "job";
    case "prayer":
      return beginner ? "morningRule" : "morningPrayers";
  }
}

/**
 * One reader's week: the road's seven, arranged by what they asked for.
 *
 * "The order you tap is the order Purify puts them in" (the line under "What
 * are you looking for?"): the first pick leads the week, as it has always
 * chosen Day 1; the second and third take the fourth and fifth days. A pick
 * the road already holds moves nothing but itself, and no page comes twice.
 * The last day stays the road's own, the door they all end at.
 */
export function weekFor(o: { road: Road; lean: Lean; level: Level | null; picks: readonly Intent[] }): WeekStep[] {
  const base = o.road === "protestant" ? PROTESTANT_WEEKS[o.lean] : ROAD_WEEKS[o.road];
  const last = WEEK_STEPS[base[WEEK_LENGTH - 1]];
  const same = (a: WeekStep, b: WeekStep) => a.href === b.href;
  let body = base.slice(0, WEEK_LENGTH - 1).map((k) => WEEK_STEPS[k]);

  const [first, second, third] = o.picks.map((p) => WEEK_STEPS[pickStep(p, o.level)]);
  if (first && !same(first, last)) body = [first, ...body.filter((s) => !same(s, first))];
  const held = (s: WeekStep) => same(s, last) || body.some((b) => same(b, s));
  if (second && !held(second)) body.splice(3, 0, second);
  if (third && !held(third)) body.splice(4, 0, third);

  return [...body.slice(0, WEEK_LENGTH - 1), last];
}

// --- What the device keeps of a week -----------------------------------

/**
 * `at` is how many steps are behind the reader, taken or passed over; `day`
 * the day (the device's own, YYYY-MM-DD) the last of them was; `passed` how
 * many in a row were passed over without being opened.
 */
export type WeekState = { at: number; day: string | null; passed: number };
export const NEW_WEEK: WeekState = { at: 0, day: null, passed: 0 };

/** Two steps passed over in a row end the week quietly: the reader has said no twice. */
export const PASSES_THAT_END = 2;

export function parseWeek(raw: string | null): WeekState {
  if (!raw) return NEW_WEEK;
  try {
    const w = JSON.parse(raw) as Partial<WeekState>;
    const at = typeof w.at === "number" && Number.isInteger(w.at) && w.at >= 0 ? Math.min(w.at, WEEK_LENGTH) : 0;
    const day = typeof w.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(w.day) ? w.day : null;
    const passed = typeof w.passed === "number" && Number.isInteger(w.passed) && w.passed >= 0 ? w.passed : 0;
    return { at, day, passed };
  } catch {
    return NEW_WEEK;
  }
}

export function weekOver(w: WeekState): boolean {
  return w.at >= WEEK_LENGTH || w.passed >= PASSES_THAT_END;
}

/**
 * The step waiting today, from 0, or null. One a day: the next appears the
 * next day the reader opens Purify. It is not tied to the calendar, so a day
 * away costs nothing; nothing counts up and nothing is lost.
 */
export function stepToday(w: WeekState, today: string): number | null {
  if (weekOver(w) || w.day === today) return null;
  return w.at;
}

/** The reader opened today's step. */
export function stepTaken(w: WeekState, today: string): WeekState {
  return { at: Math.min(w.at + 1, WEEK_LENGTH), day: today, passed: 0 };
}

/** The reader closed today's step unopened. */
export function stepPassed(w: WeekState, today: string): WeekState {
  return { at: Math.min(w.at + 1, WEEK_LENGTH), day: today, passed: w.passed + 1 };
}

/** The device's own day, YYYY-MM-DD: a week turns over at the reader's midnight, not Greenwich's. */
export function localDay(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
