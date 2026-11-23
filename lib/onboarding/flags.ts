// The roads (1.9): one switch for the whole of the revised onboarding, the
// owner's word of 2026-11-10 ("start working on and implement the revised on
// boarding system with new sections or new screens"). What it is and why is
// docs/1.9-build/notes/onboarding-fable.md.
//
// LIT ON THE BRANCH since 2026-11-10, on his word for the test builds: "when I
// try the latest build, I want to try everything as if it was public release.
// So I want to see everything they see so we could test out the bugs
// accurately." So a test build shows the new onboarding to every reader, as
// a release would, with its first test running (lib/ab/tests.ts,
// ACCOUNT_PLACE). It stays lit into 1.9 on his "roads on" after that walk,
// and "roads off" is this one line turned back (docs/1.9-build/OWNER-STEPS.md,
// R0c). In the release commit the first test's two days are set again, to
// the day of release.
//
// Testers mode (./testing.ts) still walks the new questions with nothing
// counted or synced, and a build made with NEXT_PUBLIC_ONBOARDING_ROADS=1
// has them whatever this says.
//
// Everything the roads change reads this one answer: the questions' new shape
// (./flowSteps.ts), the first week in place of Day 1 (./week.ts), the two
// cards on Today, and where "Where are you coming from?" is kept
// (./accountSync.ts).

import { isTesting } from "./testing";

/** The owner's word lights the roads for readers, and his word turns them off. See the head of this file. */
export const ROADS_LIVE = true;

/** The roads as the build has them, whoever is reading. */
export function roadsBuilt(): boolean {
  return ROADS_LIVE || process.env.NEXT_PUBLIC_ONBOARDING_ROADS === "1";
}

/** The roads on this device, now: built in, or a test under way. False on the server unless built in. */
export function roadsEnabled(): boolean {
  return roadsBuilt() || isTesting();
}

/**
 * Plus, introduced once (1.9, his 111): one calm card on Today after a new
 * reader's first week (lib/onboarding/plusIntro.ts), run as a test against
 * Purify as it is (lib/ab/tests.ts, PLUS_INTRODUCED).
 *
 * ON since 2026-11-10, his word on the stills: "yes Plus card". It runs for
 * the test builds from that day, and in the release commit its two days are
 * set again to the day of release, as the first test's are
 * (docs/1.9-build/OWNER-STEPS.md, R0c). Off again is this one line. It needs
 * the new onboarding lit as well (litNow below): the card is for a reader
 * with a road.
 */
export const PLUS_INTRO_LIVE = true;

/**
 * The Plus sheet's order (1.9; lib/ab/tests.ts, PLUS_SHEET_ORDER): when a
 * reader taps a lock, the sheet opens as it is built, on its list, or
 * straight on that feature working.
 *
 * ON since 2026-11-10, his word on the stills: "yes to all suggested", call
 * 9. On is not running: its days begin the day after the Plus card's last
 * (the registry never runs the two together), so no reader meets the second
 * version before then. In the release commit its days are set again, to
 * follow the card's (docs/1.9-build/OWNER-STEPS.md, R0c). Off again is this
 * one line. It is not part of the new onboarding, so it does not wait on
 * that flag.
 */
export const PLUS_ORDER_LIVE = true;

/** What is lit for readers in this build, by the name a test's gate asks for (lib/ab/tests.ts). */
export function litNow(): { roads: boolean; plusIntro: boolean; plusOrder: boolean } {
  return { roads: roadsBuilt(), plusIntro: roadsBuilt() && PLUS_INTRO_LIVE, plusOrder: PLUS_ORDER_LIVE };
}

/**
 * The day's frame (2.0; docs/plans/onboarding-2.0.md, row 3). A day of a
 * first week is kept by the reader's own "Done for today" at the end of its
 * page, and no longer by the tap that opens it (the owner, 2026-11-22: "I
 * want each day of the path actually worked on. right now it's just acts as
 * a hyperlink to a page", a day kept by "tapping done"; and his yes of
 * 2026-11-23 to Done at the end of the day's page, never floating over it).
 * The page says whose day it is over its head, and after Done the week's own
 * card stands in the button's place with tomorrow's step by name
 * (components/onboarding/DayFrame.tsx).
 *
 * OFF, and it ships with 2.0 (his word, 2026-11-23). It is one part of the
 * new first week, which is built as one fork and tested against today's
 * first week when its test begins (his choice of 2026-11-22; the questions'
 * test place is held until 2027-02-09). Until then a reader's week is as it
 * was: a step is taken when it is opened. Testers mode walks the frame, and
 * a build made with NEXT_PUBLIC_DAY_FRAME=1 has it whatever this says. It
 * needs the roads, since it is a week's days it frames.
 */
export const DAY_FRAME_LIVE = false;

/** The day's frame as the build has it, whoever is reading. */
export function dayFrameBuilt(): boolean {
  return roadsBuilt() && (DAY_FRAME_LIVE || process.env.NEXT_PUBLIC_DAY_FRAME === "1");
}

/** The day's frame on this device, now: built in, or a test under way. False on the server unless built in. */
export function dayFrameEnabled(): boolean {
  return dayFrameBuilt() || isTesting();
}

