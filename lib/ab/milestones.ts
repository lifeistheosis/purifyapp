// The points a test may be judged by (1.9): a closed list, each something
// that happened in a device's first two weeks after it was shown its version.
//
// A fixed two weeks for every milestone is what makes a test fair while its
// shares are moving: one version's devices are newer than the other's, and a
// newer device has had less time to finish, to subscribe or to come back. So
// nothing is read of a device until its fourteenth day has passed
// (./bandit.ts, MATURE_DAYS), and nothing that happens after its thirteenth
// day is sent at all (./device.ts).
//
// A milestone is a word on a row and nothing more: no account, no device id,
// no session id, and the day the device was shown its version, not a time.
// The server takes only the words on this list (lib/security/schemas.ts).

export const MILESTONES = [
  /** The welcome questions reached their end (the handoff), not left by Skip. */
  "finished",
  /** Someone was signed in on the device: an account made, or signed in to. */
  "account",
  /** The first step of the first week was opened from Today. */
  "first_step",
  /** The device opened Purify again in its second week, days 7 to 13. */
  "back_week2",
  /** A Plus subscription was bought in the sheet. */
  "plus_bought",
] as const;
export type Milestone = (typeof MILESTONES)[number];

export function isMilestone(v: unknown): v is Milestone {
  return typeof v === "string" && (MILESTONES as readonly string[]).includes(v);
}

/** The last day, counted from the day shown (day 0), on which anything is sent for a device. */
export const LAST_DAY = 13;
/** "Back in its second week" begins on this day. */
export const SECOND_WEEK = 7;

/** Whether a milestone reached `age` days after the device was shown its version counts. */
export function inWindow(what: Milestone, age: number): boolean {
  if (!(age >= 0 && age <= LAST_DAY)) return false;
  return what === "back_week2" ? age >= SECOND_WEEK : true;
}
