// Testers mode (1.8): whether an admin is using this device to see Purify as
// another kind of reader (the owner, 2026-10-28: "a testers mode for admins
// (I am able to easily switch the preference of my user to test out what
// different backgrounds see (Catholic protestant inquiring etc)").
//
// Its own file with nothing imported, so the onboarding's state, its counts
// and the account sync can each ask without importing one another. What a
// test switches, and how the device comes back, is ./testers.ts. While this
// says yes:
//
//   - nothing is counted (lib/onboarding/count.ts, countingAllowed), and the
//     screens' counts ask the same;
//   - the answers on the device never reach the account
//     (lib/onboarding/accountSync.ts, lib/profile/preferences.ts), and the
//     account's never fill the device (fillSpaceFromAccount), so a test is
//     the test and nothing else.

/** Set while testing, to what the device held before (./testers.ts). */
export const TESTERS_KEY = "purify:testers";

/** Fired in-tab when Testers mode starts or ends. */
export const TESTERS_EVENT = "purify:testers";

export function isTesting(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TESTERS_KEY) != null;
  } catch {
    // Storage shut: Testers mode cannot have been started.
    return false;
  }
}
