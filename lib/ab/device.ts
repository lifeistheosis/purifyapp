// A test on this device (1.9): its version, saying once that it was shown,
// and saying when a milestone is reached
// (docs/1.9-build/notes/onboarding-fable.md, sections 4 and 10).
//
// What the device keeps (localStorage, never sent, never copied to an account):
//   purify:ab.seed     the random number its versions are worked out from (./assign.ts)
//   purify:ab.mine     for each test it is in: the version it was given, the
//                      day it was shown it, and the milestones already said
//   purify:ab.weights  the tests' shares as the website last gave them
//   purify:ab.pick     Testers mode: the version an admin chose to look at
//
// What it sends, and only while a test is running and AB_SENDING is on
// (./tests.ts): "a device was shown this version" once, and "a device shown
// this version reached this point" once for each milestone the test reads.
// The test, the version, the milestone, the kind of device, and the day it
// was shown. No account, no device id, no session id.
//
// Who is never in a test: automation, a device the admin has been opened
// on, a device in Testers mode (lib/onboarding/count.ts, countingAllowed):
// the same devices whose visits are never counted. In Testers mode an admin
// picks the version to look at (pickArm), and it is said to nobody.

import { countPlatform, countingAllowed } from "@/lib/onboarding/count";
import { daysBetween, utcDay } from "@/lib/onboarding/counting";
import { litNow } from "@/lib/onboarding/flags";
import { isTesting } from "@/lib/onboarding/testing";
import { isNativeClient } from "@/lib/platform/native";
import { SITE_URL } from "@/lib/site";

import { armOf, readSeed } from "./assign";
import { inWindow, type Milestone } from "./milestones";
import { AB_SENDING, AB_TESTS, runningTest, type AbSurface, type AbTest } from "./tests";

const MINE_KEY = "purify:ab.mine";
const WEIGHTS_KEY = "purify:ab.weights";
export const PICK_KEY = "purify:ab.pick";
/** The shares are asked for again once they are this old. */
const WEIGHTS_FRESH_MS = 6 * 60 * 60 * 1000;

type Mine = Record<string, { arm: string; shown: string | null; said: Milestone[] }>;
type KeptWeights = { at: number; tests: Record<string, Record<string, number>> };

function readJson<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(window.localStorage.getItem(key) ?? "null") as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const lit = () => litNow();

/**
 * The website, from a page of it or from the apps. A plain fetch with no
 * credentials, as the locks' counts are sent (lib/analytics/lockCount.ts): a
 * test's row and its shares carry no cookie and no sign-in.
 */
const site = (path: string) => (isNativeClient() ? `${SITE_URL}${path}` : path);

/** Testers mode: the version an admin chose to look at. Kept on the device, said to nobody. */
export function pickArm(testId: string, arm: string | null): void {
  if (typeof window === "undefined") return;
  const picks = readJson<Record<string, string>>(PICK_KEY, {});
  if (arm) picks[testId] = arm;
  else delete picks[testId];
  writeJson(PICK_KEY, picks);
}
export function pickedArm(testId: string): string | null {
  if (typeof window === "undefined") return null;
  return readJson<Record<string, string>>(PICK_KEY, {})[testId] ?? null;
}

/**
 * Ask the website for the tests' shares, when a test is running and the
 * ones kept are stale. One public setting, the same for every device, sent
 * with nothing of the reader. Fire and forget: a device that has none yet
 * uses equal shares.
 */
export function refreshWeights(tests: readonly AbTest[] = AB_TESTS): void {
  if (typeof window === "undefined" || isTesting() || !countingAllowed()) return;
  const today = utcDay(new Date());
  if (!tests.some((t) => runningTest(t.surface, today, lit(), tests)?.id === t.id)) return;
  const kept = readJson<KeptWeights | null>(WEIGHTS_KEY, null);
  if (kept && Date.now() - kept.at < WEIGHTS_FRESH_MS) return;
  void fetch(site("/api/ab/weights"), { credentials: "omit" })
    .then((res) => (res.ok ? res.json() : null))
    .then((body: { tests?: Record<string, { weights?: Record<string, number> }> } | null) => {
      if (!body?.tests) return;
      const out: KeptWeights["tests"] = {};
      for (const [id, t] of Object.entries(body.tests)) if (t?.weights) out[id] = t.weights;
      writeJson(WEIGHTS_KEY, { at: Date.now(), tests: out } satisfies KeptWeights);
    })
    .catch(() => {});
}

/**
 * The version this device shows on a surface: the running test and the arm
 * it was given, or null when no test is running there, the device is outside
 * the test's share, or it is a device that is never in a test. Given once,
 * from the shares as they stand that day, and kept: a device never changes
 * version.
 */
export function armHere(surface: AbSurface, tests: readonly AbTest[] = AB_TESTS): { test: AbTest; arm: string } | null {
  if (typeof window === "undefined") return null;
  if (isTesting()) {
    // An admin looks at the version they picked, whether or not a test is running.
    for (const test of tests) {
      const picked = test.surface === surface ? pickedArm(test.id) : null;
      if (picked && test.arms.includes(picked)) return { test, arm: picked };
    }
    return null;
  }
  const test = runningTest(surface, utcDay(new Date()), lit(), tests);
  if (!test || !countingAllowed()) return null;
  const mine = readJson<Mine>(MINE_KEY, {});
  const kept = mine[test.id];
  if (kept && test.arms.includes(kept.arm)) return { test, arm: kept.arm };
  const weights = readJson<KeptWeights | null>(WEIGHTS_KEY, null)?.tests[test.id] ?? null;
  const arm = armOf(test, readSeed(), weights);
  if (!arm) return null;
  // A device that cannot keep its version is in no test: it would be given another tomorrow.
  if (!writeJson(MINE_KEY, { ...mine, [test.id]: { arm, shown: null, said: [] } } satisfies Mine)) return null;
  return { test, arm };
}

function send(body: Record<string, unknown>): void {
  try {
    void fetch(site("/api/track/event"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "omit",
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* the row is lost, nothing else */
  }
}

/**
 * Say, once for this device, that it was shown its version. Call it at the
 * last moment the versions are still the same screen, never where the arm
 * is worked out and never on a version's own screen: the two versions'
 * readers are then the same readers, and a device that was given a version
 * and never got that far is not counted as having seen it.
 */
export function exposed(surface: AbSurface, tests: readonly AbTest[] = AB_TESTS): void {
  if (!AB_SENDING || typeof window === "undefined" || isTesting()) return;
  const here = armHere(surface, tests);
  if (!here) return;
  const mine = readJson<Mine>(MINE_KEY, {});
  const kept = mine[here.test.id];
  if (!kept || kept.shown) return;
  // Marked before it is sent: a device that cannot keep the mark says nothing, rather than saying it on every visit.
  if (!writeJson(MINE_KEY, { ...mine, [here.test.id]: { ...kept, shown: utcDay(new Date()) } } satisfies Mine)) return;
  send({ name: "ab_exposed", props: { test: here.test.id, arm: here.arm, platform: countPlatform() } });
}

/**
 * A milestone was reached on this device. Said once for each test the
 * device was shown a version of and that reads this milestone, and only
 * inside the device's first two weeks after it was shown (./milestones.ts).
 * A test that has ended since still hears from the devices it showed.
 */
export function reached(what: Milestone, tests: readonly AbTest[] = AB_TESTS): void {
  if (!AB_SENDING || typeof window === "undefined" || isTesting() || !countingAllowed()) return;
  const mine = readJson<Mine>(MINE_KEY, {});
  const today = utcDay(new Date());
  const now: { test: string; arm: string; shown: string }[] = [];
  for (const test of tests) {
    const kept = mine[test.id];
    if (!kept?.shown || kept.said.includes(what)) continue;
    if (test.judge !== what && !test.guards.includes(what)) continue;
    if (!inWindow(what, daysBetween(kept.shown, today))) continue;
    mine[test.id] = { ...kept, said: [...kept.said, what] };
    now.push({ test: test.id, arm: kept.arm, shown: kept.shown });
  }
  // Marked before it is sent, as "shown" is.
  if (!now.length || !writeJson(MINE_KEY, mine)) return;
  for (const row of now) send({ name: "ab_reached", props: { ...row, what, platform: countPlatform() } });
}

/** Whether this device was shown a version of a test, and which. For a screen that must stay as it was for those readers. */
export function shownArm(testId: string): string | null {
  if (typeof window === "undefined") return null;
  const kept = readJson<Mine>(MINE_KEY, {})[testId];
  return kept?.shown ? kept.arm : null;
}

/**
 * On any page load: the milestones that are a state of the device and not a
 * tap. It opened Purify again (in its second week, the window says), and
 * whether someone is signed in on it.
 */
export function abTick(signedIn: boolean, tests: readonly AbTest[] = AB_TESTS): void {
  if (typeof window === "undefined") return;
  reached("back_week2", tests);
  if (signedIn) reached("account", tests);
}
