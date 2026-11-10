// The tests Purify runs: one file, in the repository (1.9). The why and the
// rules are docs/1.9-build/notes/onboarding-fable.md, sections 4 and 10.
//
// A test is added, changed and ended by a commit here, so each is reviewed
// like code and there is a record of what ran and when. No dashboard decides
// what a reader sees.
//
// ONE IS REGISTERED, AND IT IS NOT RUNNING: the account's place, the owner's
// "go" of 2026-11-10. It runs only while the roads are lit for readers
// (lib/onboarding/flags.ts, ROADS_LIVE), so not before release, and never in
// Testers mode. The sender is on (AB_SENDING): the privacy page has carried
// its sentence since 3d4be178, and with no test running nothing is sent.
//
// To add one, in a single change:
//   1. its entry in AB_TESTS below, with the one milestone it is judged by,
//      the milestones that must not get worse, how many readers it needs and
//      its last day;
//   2. where the screen that differs is drawn: `armHere` to choose, and
//      `exposed` at the last moment the versions are the same screen
//      (./device.ts). The server takes its words by itself: its closed list
//      is built from this file (lib/security/schemas.ts);
//   3. a new milestone, if it needs one (./milestones.ts), with its sentence
//      on /privacy in the same change.
//
// What may be tested: two honest versions of the same screen. Never the
// paywall of a reader who named a need, never a countdown, scarcity or a
// subscriber count (components/billing/UpgradeModal.tsx), never a
// notification that puts a clock on the reader (lib/push/doctrine.ts), never
// the texts. A price, a trial or what Plus includes is tested in RevenueCat,
// on the owner's word for that one test.

import { MILESTONES, type Milestone } from "./milestones";

/**
 * Where a test lives: any screen may register one. A device is in at most
 * one test on a surface at a time. "offer" is a price, a trial or what Plus
 * includes: such a test is the owner's word each time (see `word`), and its
 * versions are RevenueCat offerings, never two prices drawn by the app.
 */
export type AbSurface = "onboarding" | "today" | "plus" | "plans" | "reminders" | "themes" | "offer";
export const AB_SURFACES: readonly AbSurface[] = ["onboarding", "today", "plus", "plans", "reminders", "themes", "offer"];

/** What a test may wait on before it runs. */
export type AbGate = "roads" | "plusIntro" | "plusOrder";
export type AbLit = Readonly<Record<AbGate, boolean>>;

export type AbTest = {
  /** A short name: lower-case letters, digits and dashes. Never reused for another test. */
  id: string;
  surface: AbSurface;
  /** The question, in a sentence, as the admin reads it. */
  asks: string;
  /** The versions, the first of them Purify as it is built: what a test falls back to. Two to four short words. */
  arms: readonly string[];
  /** The share of devices in the test, above 0 and up to 1. The rest see Purify as it is and are not counted in it. */
  share: number;
  /** First and last day, YYYY-MM-DD (UTC). */
  begins: string;
  ends: string;
  /**
   * Runs only while this holds (lib/onboarding/flags.ts, litNow): "roads" is
   * the revised onboarding lit for readers; "plusIntro" is the Plus card
   * after the first week and "plusOrder" the Plus sheet's order, each shut
   * until the owner has seen its stills.
   */
  gate?: AbGate;
  /** Tests this one never runs together with, by id: they read the same readers at the same moment. */
  apart?: readonly string[];
  /** The one milestone the test is judged by, decided before it starts. */
  judge: Milestone;
  /** The milestones that must not get clearly worse: a change that sells more and keeps fewer loses. */
  guards: readonly Milestone[];
  /** Devices each version needs, their two weeks behind them, before the test may settle (./size.ts). */
  needs: number;
  /** Devices each version needs before the shares begin to move. */
  warmup: number;
  /** The least share any version is given while the test runs, so the system can change its mind. */
  floor: number;
  /**
   * The day the owner said yes to this one test, YYYY-MM-DD. Required of a
   * test on a price, a trial or what Plus includes (surface "offer"); the
   * registry refuses one without it.
   */
  word?: string;
};

/**
 * The account's place (the owner's question 106, his "go" of 2026-11-10).
 *
 * A new reader with no account is offered one either by the card on Today
 * after a first step of their week ("card", as built), or as the last of the
 * welcome questions ("end"). Judged by readers coming back in their second
 * week; finishing the questions, accounts and Plus must not get clearly
 * worse. A reader who is signed in already is in neither version.
 *
 * ITS DAYS ARE SET AGAIN IN THE RELEASE COMMIT: the first day the day of
 * release, the last twelve weeks on. The days below are the test builds'
 * (his word of 2026-11-10, to try everything "as if it was public release"):
 * they begin on the day the roads were lit on the branch, so a test build
 * runs the test as a release will. A test build talks to the test web, so
 * none of its rows reach the main web. lib/ab/__tests__/tests.test.ts
 * refuses lit roads with days that are not twelve weeks apart.
 */
export const ACCOUNT_PLACE: AbTest = {
  id: "account-place",
  surface: "onboarding",
  asks: "Where should a new reader be offered an account: a card on Today after their first step, or the last of the welcome questions?",
  arms: ["card", "end"],
  share: 1,
  begins: "2026-11-10",
  ends: "2027-02-02",
  gate: "roads",
  judge: "back_week2",
  guards: ["finished", "account", "plus_bought"],
  needs: 1100,
  warmup: 200,
  floor: 0.2,
};

/**
 * Plus, introduced once (the owner's 111, built on his "everything in 1.9"
 * of 2026-11-10; lib/onboarding/plusIntro.ts).
 *
 * A new reader without Plus, a week after the questions, meets Plus either
 * only as the locks they come upon ("locks", as built), or also once, as one
 * calm card on Today that shows the one Plus feature fitting what they said
 * they came for and opens its Try it ("card"). Never a reader who is back,
 * never where Plus is not sold, never the newcomer's road.
 *
 * Judged by Plus bought; readers coming back must not get clearly worse. A
 * purchase is rare, so this needs many readers and may well end unsettled,
 * in which case Purify stays as it is.
 *
 * SHUT: its gate is PLUS_INTRO_LIVE (lib/onboarding/flags.ts), false until
 * the owner has seen the card's stills. ITS DAYS ARE SET WHEN IT IS LIT, as
 * the first test's were; until then they hold nothing open. It never runs
 * together with the Plus sheet's order test (`apart`), since both read the
 * same buyers.
 */
export const PLUS_INTRODUCED: AbTest = {
  id: "plus-introduced",
  surface: "today",
  asks: "Should a new reader meet Plus only as the locks they come upon, or also once, on a calm card on Today after their first week?",
  arms: ["locks", "card"],
  share: 1,
  begins: "2026-11-10",
  ends: "2026-11-10",
  gate: "plusIntro",
  apart: ["plus-sheet-order"],
  judge: "plus_bought",
  guards: ["back_week2"],
  // To tell 2 in 100 buying from 4 in 100 (./size.ts, readersPerArm).
  needs: 1140,
  warmup: 200,
  floor: 0.2,
};

/**
 * The Plus sheet's order (built on the owner's "everything in 1.9" of
 * 2026-11-10; components/billing/UpgradeModal.tsx).
 *
 * A reader who taps a lock is shown the sheet either as it is built, on its
 * list with the tapped feature first and lit ("list"), or straight on that
 * feature working, its own Try it, with the list one tap back ("working").
 * The plans stand at the foot of the sheet in both, as they always have. The
 * same price, the same words, the same close: nothing a reader pays or reads
 * differs, so this is not a test on an offer and needs no word of its own
 * beyond his yes to the stills.
 *
 * Only a lock with a feature behind it: the Plus button opens the sheet as
 * built for everyone, and so does the one card that introduces Plus, which
 * already opens on the feature working.
 *
 * Judged by the button to subscribe tapped; Plus bought and readers coming
 * back must not get clearly worse.
 *
 * SHUT: its gate is PLUS_ORDER_LIVE (lib/onboarding/flags.ts). ITS DAYS ARE
 * SET WHEN IT IS LIT, and never across the Plus card's days (`apart`): both
 * read the same buyers.
 */
export const PLUS_SHEET_ORDER: AbTest = {
  id: "plus-sheet-order",
  surface: "plus",
  asks: "When a reader taps a lock, should the Plus sheet open on its list, with that feature first, or straight on that feature working?",
  arms: ["list", "working"],
  share: 1,
  begins: "2026-11-11",
  ends: "2026-11-11",
  gate: "plusOrder",
  apart: ["plus-introduced"],
  judge: "plus_pay",
  guards: ["plus_bought", "back_week2"],
  // To tell 5 in 100 tapping the button from 8 in 100 (./size.ts, readersPerArm).
  needs: 1060,
  warmup: 200,
  floor: 0.2,
};

export const AB_TESTS: readonly AbTest[] = [ACCOUNT_PLACE, PLUS_INTRODUCED, PLUS_SHEET_ORDER];

/**
 * Whether a "shown" or a "reached" row may leave a device. On since the
 * privacy page carried the sentence for tests (the owner's "sure" of
 * 2026-11-10; lib/admin/__tests__/privacyLines.test.ts holds the page to it).
 */
export const AB_SENDING = true;

/** No test moves its shares on fewer devices a version than this. */
export const SMALLEST_WARMUP = 100;

const ID = /^[a-z0-9](?:[a-z0-9-]{0,22}[a-z0-9])?$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** What is wrong with a registry, in plain words; empty when nothing is. */
export function registryFaults(tests: readonly AbTest[]): string[] {
  const faults: string[] = [];
  const seen = new Set<string>();
  for (const t of tests) {
    const at = `"${t.id}"`;
    if (!ID.test(t.id)) faults.push(`${at}: an id is lower-case letters, digits and dashes, 24 at most`);
    if (seen.has(t.id)) faults.push(`${at}: an id is used once`);
    seen.add(t.id);
    if (t.arms.length < 2 || t.arms.length > 4) faults.push(`${at}: two to four arms`);
    if (new Set(t.arms).size !== t.arms.length) faults.push(`${at}: each arm named once`);
    for (const arm of t.arms) if (!ID.test(arm) || arm.length > 12) faults.push(`${at}: arm "${arm}" is a short word`);
    if (!(t.share > 0 && t.share <= 1)) faults.push(`${at}: share is above 0 and up to 1`);
    if (!DAY.test(t.begins) || !DAY.test(t.ends) || t.ends < t.begins) faults.push(`${at}: a first and a last day, in order`);
    if (!t.asks.trim()) faults.push(`${at}: the question it asks, in a sentence`);
    if (!(MILESTONES as readonly string[]).includes(t.judge)) faults.push(`${at}: the one milestone it is judged by`);
    if (t.guards.length === 0) faults.push(`${at}: at least one milestone that must not get worse`);
    if (t.guards.some((g) => !(MILESTONES as readonly string[]).includes(g) || g === t.judge)) faults.push(`${at}: its guards are milestones, and not the judge`);
    if (!(Number.isInteger(t.needs) && t.needs >= 100)) faults.push(`${at}: how many readers each arm needs, a hundred at least`);
    if (!(Number.isInteger(t.warmup) && t.warmup >= SMALLEST_WARMUP && t.warmup <= t.needs)) faults.push(`${at}: a warmup of ${SMALLEST_WARMUP} at least, and no more than it needs`);
    if (!(t.floor >= 0.05 && t.floor <= 1 / t.arms.length)) faults.push(`${at}: a floor of 5% at least, and no more than an equal share`);
  }
  for (const t of tests) {
    if (t.surface === "offer" && !(t.word && DAY.test(t.word))) {
      faults.push(`"${t.id}": a test on a price, a trial or what Plus includes names the day of the owner's word for it`);
    }
  }
  for (const a of tests) {
    for (const b of tests) {
      if (!(a.id < b.id && a.begins <= b.ends && b.begins <= a.ends)) continue;
      // One test on a surface at a time: a screen shows one test's version, never two.
      if (a.surface === b.surface) faults.push(`"${a.id}" and "${b.id}" run on ${a.surface} at the same time`);
      // And one test judged on readers coming back at a time: two would each
      // move the thing the other is judged by, and neither could be read.
      else if (a.judge === "back_week2" && b.judge === "back_week2") {
        faults.push(`"${a.id}" and "${b.id}" are both judged on readers coming back, at the same time`);
      }
      // And two tests that name each other apart never share a day.
      if (a.apart?.includes(b.id) || b.apart?.includes(a.id)) faults.push(`"${a.id}" and "${b.id}" are kept apart, and run at the same time`);
    }
  }
  return faults;
}

/**
 * The test running on a surface on a day (YYYY-MM-DD, UTC), if any. `lit`
 * says which gates are open: a test with a gate runs only while its gate is.
 */
export function runningTest(
  surface: AbSurface,
  day: string,
  lit: AbLit,
  tests: readonly AbTest[] = AB_TESTS,
): AbTest | null {
  return tests.find((t) => t.surface === surface && t.begins <= day && day <= t.ends && (!t.gate || lit[t.gate])) ?? null;
}

/** A test and an arm as one word, the only form in which either leaves a device: "day1-guided:b". */
export function abWord(test: Pick<AbTest, "id">, arm: string): string {
  return `${test.id}:${arm}`;
}

/** Every word the registry can say: the closed list the server takes. */
export function abWords(tests: readonly AbTest[] = AB_TESTS): string[] {
  return tests.flatMap((t) => t.arms.map((arm) => abWord(t, arm)));
}

/** Whether a word is a version of a registered test. What the server's closed list asks. */
export function isAbArm(testId: string, arm: string, tests: readonly AbTest[] = AB_TESTS): boolean {
  return tests.some((t) => t.id === testId && t.arms.includes(arm));
}

/** Whether a registered test reads a milestone, as its judge or as a guard. */
export function readsMilestone(testId: string, what: Milestone, tests: readonly AbTest[] = AB_TESTS): boolean {
  return tests.some((t) => t.id === testId && (t.judge === what || t.guards.includes(what)));
}

/** The two rows a test sends, by name. */
export const AB_EVENTS = ["ab_exposed", "ab_reached"] as const;
export function isAbEvent(name: string): name is (typeof AB_EVENTS)[number] {
  return (AB_EVENTS as readonly string[]).includes(name);
}

/**
 * The day a "reached" row is kept under: the day its device was shown its
 * version, as the device says it, if that is a day a device could honestly
 * say. A milestone is sent only in a device's first two weeks after it was
 * shown (./milestones.ts), so the day is within them, give or take a day
 * for a clock set a little wrong; anything else is refused.
 */
export function shownDayOk(shown: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shown)) return false;
  const age = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${shown}T00:00:00Z`)) / 86_400_000);
  return Number.isFinite(age) && age >= -1 && age <= 15;
}

/**
 * The tests that come after, in the order the owner agreed (2026-11-10), as
 * a record and for his panel. (The Plus sheet's order and Plus, introduced
 * once, were the second and third of them, and are built and registered
 * above, shut.) NOT BUILT AND NOT REGISTERED: a test's second
 * version is built two weeks before its turn, so it is built against the
 * screens as they then are, and each waits for the one before it to settle
 * or end. `waits` says what each is waiting for besides its turn.
 */
export type PlannedTest = { id: string; asks: string; versions: readonly string[]; judge: string; guards: string; waits: string };

export const AB_PLANNED: readonly PlannedTest[] = [
  {
    id: "reminders-moment",
    asks: "When should a reader be asked about reminders: on the account card, or in one line right after a first finished prayer or chapter?",
    versions: ["On the account card, as built", 'After a first prayer or chapter: "Shall Purify remind you tomorrow?"'],
    judge: "Readers coming back in their second week. Early sign: reminders turned on.",
    guards: "Accounts; Plus bought.",
    waits:
      "Reminders that need no account on the phones. Today a reminder is kept with an account, so for a reader with none the second version would be the account card under another name. It is worth testing once a phone can remind without one.",
  },
];

