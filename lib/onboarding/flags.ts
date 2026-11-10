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
 * Purify as it is (lib/ab/tests.ts, PLUS_INTRODUCED). Built and SHUT: his
 * word of 2026-11-10 puts the card's stills before him first, and nothing
 * shows it to a reader until this is true. In Testers mode an admin picks
 * the version to look at, whatever this says.
 */
export const PLUS_INTRO_LIVE = false;

/** What is lit for readers in this build, by the name a test's gate asks for (lib/ab/tests.ts). */
export function litNow(): { roads: boolean; plusIntro: boolean } {
  return { roads: roadsBuilt(), plusIntro: roadsBuilt() && PLUS_INTRO_LIVE };
}
