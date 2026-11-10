// The roads (1.9): one switch for the whole of the revised onboarding, the
// owner's word of 2026-11-10 ("start working on and implement the revised on
// boarding system with new sections or new screens"). What it is and why is
// docs/1.9-build/notes/onboarding-fable.md.
//
// Off for readers. On in two places, so he tries it on his own phone before
// anyone meets it, and 1.9 ships the same with or without it:
//
//   - while Testers mode is on (./testing.ts): Settings, Testers, "First
//     open" walks the new questions, and nothing is counted or synced;
//   - in a build made with NEXT_PUBLIC_ONBOARDING_ROADS=1.
//
// Lit for readers only on his word, by turning ROADS_LIVE to true. Everything
// the roads change reads this one answer: the questions' new shape
// (./flowSteps.ts), the first week in place of Day 1 (./week.ts), the two
// cards on Today, and where "Where are you coming from?" is kept
// (./accountSync.ts).

import { isTesting } from "./testing";

/** Turned to true on the owner's word, after he has tried it. Nothing else lights the roads for readers. */
export const ROADS_LIVE = false;

/** The roads as the build has them, whoever is reading. */
export function roadsBuilt(): boolean {
  return ROADS_LIVE || process.env.NEXT_PUBLIC_ONBOARDING_ROADS === "1";
}

/** The roads on this device, now: built in, or a test under way. False on the server unless built in. */
export function roadsEnabled(): boolean {
  return roadsBuilt() || isTesting();
}
