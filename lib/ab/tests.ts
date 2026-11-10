// The tests Purify runs: one file, in the repository (1.9). The why and the
// rules are docs/1.9-build/notes/onboarding-fable.md, section 4.
//
// A test is added, changed and ended by a commit here, so each is reviewed
// like code and there is a record of what ran and when. No dashboard decides
// what a reader sees.
//
// NONE IS RUNNING. The list is empty and the sender is off (AB_SENDING), on
// the owner's frame of 2026-11-10: the system is built, and no test runs
// until he has agreed its sentence on the privacy page (his question 112).
//
// To run one, in a single change:
//   1. its entry in AB_TESTS below, with the one outcome it is judged by, the
//      number that must not fall, how many readers it needs and its last day;
//   2. its words on the server's closed list (lib/security/schemas.ts): the
//      `ab_exposed` event and the optional `ab` word on the rows that carry
//      an outcome. lib/ab/__tests__/tests.test.ts refuses a running test the
//      server would not take;
//   3. the sentence on /privacy, and AB_SENDING turned on.
//
// What may be tested: two honest versions of the same screen. Never the
// paywall of a reader who named a need, never a countdown, scarcity or a
// subscriber count (components/billing/UpgradeModal.tsx), never a
// notification that puts a clock on the reader (lib/push/doctrine.ts).

/** Where a test lives. A device is in at most one test on each surface at a time. */
export type AbSurface = "onboarding" | "plus";
export const AB_SURFACES: readonly AbSurface[] = ["onboarding", "plus"];

export type AbTest = {
  /** A short name: lower-case letters, digits and dashes. Never reused for another test. */
  id: string;
  surface: AbSurface;
  /** The versions, the first of them Purify as it is. Two to four short words. */
  arms: readonly string[];
  /** The share of devices in the test, above 0 and up to 1. The rest see Purify as it is and are not counted in it. */
  share: number;
  /** First and last day, YYYY-MM-DD (UTC). Whole weeks: a Sunday's readers are not a Tuesday's. */
  begins: string;
  ends: string;
  /** The one count the test is judged by, decided before it starts. */
  outcome: string;
  /** The count that must not fall: a change that sells more and keeps fewer loses. */
  guard: string;
  /** Readers each arm needs before the result means anything (./size.ts, readersPerArm). */
  needs: number;
};

/** Nothing is running. See the head of this file before adding one. */
export const AB_TESTS: readonly AbTest[] = [];

/**
 * Whether an exposure or an arm may leave a device. Off until the owner has
 * agreed the privacy page's sentence for tests. While it is off a device
 * still works out its arm (so a build can be walked), and says nothing.
 */
export const AB_SENDING = false;

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
    if (!t.outcome.trim()) faults.push(`${at}: the one outcome it is judged by`);
    if (!t.guard.trim()) faults.push(`${at}: the count that must not fall`);
    if (!(Number.isInteger(t.needs) && t.needs >= 100)) faults.push(`${at}: how many readers each arm needs, a hundred at least`);
  }
  // One test on a surface at a time: a row carries one test's word, never two.
  for (const a of tests) {
    for (const b of tests) {
      if (a.id < b.id && a.surface === b.surface && a.begins <= b.ends && b.begins <= a.ends) {
        faults.push(`"${a.id}" and "${b.id}" run on ${a.surface} at the same time`);
      }
    }
  }
  return faults;
}

/** The test running on a surface on a day (YYYY-MM-DD, UTC), if any. */
export function runningTest(surface: AbSurface, day: string, tests: readonly AbTest[] = AB_TESTS): AbTest | null {
  return tests.find((t) => t.surface === surface && t.begins <= day && day <= t.ends) ?? null;
}

/** A test and an arm as one word, the only form in which either leaves a device: "day1-guided:b". */
export function abWord(test: Pick<AbTest, "id">, arm: string): string {
  return `${test.id}:${arm}`;
}

/** Every word the registry can say: the closed list the server takes. */
export function abWords(tests: readonly AbTest[] = AB_TESTS): string[] {
  return tests.flatMap((t) => t.arms.map((arm) => abWord(t, arm)));
}
