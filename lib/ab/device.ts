// A test on this device (1.9): its arm, and saying once that it was shown
// (docs/1.9-build/notes/onboarding-fable.md, 4.1 and 4.2).
//
// Who is never in a test: automation, a device the admin has been opened
// on, a device in Testers mode (lib/onboarding/count.ts, countingAllowed):
// the same devices whose visits are never counted. In Testers mode an admin
// picks the arm to look at instead (pickArm), and it is said to nobody.
//
// NOTHING IS SENT while AB_SENDING is off (./tests.ts), and no test is
// running: this file is the whole of the device's part, ready and silent.

import { apiFetch } from "@/lib/api/client";
import { countPlatform, countingAllowed } from "@/lib/onboarding/count";
import { utcDay } from "@/lib/onboarding/counting";
import { isTesting } from "@/lib/onboarding/testing";

import { armOf, readSeed } from "./assign";
import { AB_SENDING, AB_TESTS, abWord, runningTest, type AbSurface, type AbTest } from "./tests";

const EXPOSED_KEY = "purify:ab.exposed"; // JSON array of test ids already said
const PICK_KEY = "purify:ab.pick"; // Testers mode: JSON { [test id]: arm }

function readJson<T>(key: string, fallback: T): T {
  try {
    return (JSON.parse(window.localStorage.getItem(key) ?? "null") as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Testers mode: the arm an admin chose to look at. Kept on the device, said to nobody. */
export function pickArm(testId: string, arm: string | null): void {
  try {
    const picks = readJson<Record<string, string>>(PICK_KEY, {});
    if (arm) picks[testId] = arm;
    else delete picks[testId];
    window.localStorage.setItem(PICK_KEY, JSON.stringify(picks));
  } catch {
    /* nothing kept: the device shows its own arm */
  }
}

/**
 * The version this device shows on a surface today: the running test and
 * its arm, or null when no test is running there, the device is outside the
 * test's share, or it is a device that is never in a test.
 */
export function armHere(surface: AbSurface, tests: readonly AbTest[] = AB_TESTS): { test: AbTest; arm: string } | null {
  if (typeof window === "undefined") return null;
  const test = runningTest(surface, utcDay(new Date()), tests);
  if (!test) return null;
  if (isTesting()) {
    const picked = readJson<Record<string, string>>(PICK_KEY, {})[test.id];
    return picked && test.arms.includes(picked) ? { test, arm: picked } : null;
  }
  if (!countingAllowed()) return null;
  const arm = armOf(test, readSeed());
  return arm ? { test, arm } : null;
}

/** The word an outcome row carries for this device on a surface ("day1-guided:b"), or undefined. */
export function abWordHere(surface: AbSurface, tests: readonly AbTest[] = AB_TESTS): string | undefined {
  if (!AB_SENDING || isTesting()) return undefined;
  const here = armHere(surface, tests);
  return here ? abWord(here.test, here.arm) : undefined;
}

/**
 * Say, once for this device, that the screen that differs was shown: the
 * test, the arm, the kind of device and nothing else. Call it where the
 * screen is drawn, never where the arm is worked out, so a device that was
 * assigned and never reached the screen is not counted as having seen it.
 */
export function exposed(surface: AbSurface, tests: readonly AbTest[] = AB_TESTS): void {
  if (!AB_SENDING || typeof window === "undefined" || isTesting()) return;
  const here = armHere(surface, tests);
  if (!here) return;
  const said = readJson<string[]>(EXPOSED_KEY, []);
  if (said.includes(here.test.id)) return;
  // Marked before it is sent: a device that cannot keep the mark says nothing, rather than saying it on every visit.
  try {
    window.localStorage.setItem(EXPOSED_KEY, JSON.stringify([...said, here.test.id]));
  } catch {
    return;
  }
  void apiFetch("/api/track/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "ab_exposed", props: { test: here.test.id, arm: here.arm, platform: countPlatform() } }),
    keepalive: true,
  }).catch(() => {});
}
