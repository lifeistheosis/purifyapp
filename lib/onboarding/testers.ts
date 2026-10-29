// Testers mode (1.8): an admin sees Purify as another kind of reader, and
// comes back. The owner, 2026-10-28: "add a testers mode for admins (I am
// able to easily switch the preference of my user to test out what different
// backgrounds see (Catholic protestant inquiring etc)".
//
// The first switch keeps everything a test can change, once, under
// TESTERS_KEY; every switch after it writes only the device's answers, so
// every screen that reads the reader's type (lib/onboarding/useReaderType.ts)
// shows that reader at once; "Back to my own" writes back exactly what was
// kept, a key that was absent absent again, and ends the mode. Nothing here
// is counted or sent anywhere: while the mode is on the counts and the
// account sync stand still (./testing.ts says how).
//
// Who may see the switches is the server's to say (app/api/admin/whoami);
// this file only does what it is asked on this device. Hook-free, like
// ./state.ts, so it is tested directly (lib/onboarding/__tests__/testers.test.ts).

import { CALENDAR_STYLE_COOKIE, CALENDAR_STYLE_EVENT, CALENDAR_STYLE_KEY } from "@/lib/calendar/styleDefault";

import { defaultsFor, depthFor, type Background, type Level } from "./space";
import {
  ONBOARDING_EVENT,
  SPACE_KEYS,
  refreshDayOne,
  writeBackground,
  writeDepth,
  writeFastingRule,
  writeLevel,
} from "./state";
import { TESTERS_EVENT, TESTERS_KEY, isTesting } from "./testing";

/**
 * Every key a test can change, kept and put back as one: the answers and the
 * flow's own marks (a "First open" runs the whole flow, which also sets the
 * calendar a new reader starts on).
 */
export const TESTER_KEYS: readonly string[] = [...SPACE_KEYS, CALENDAR_STYLE_KEY];

/** What the device held before the test: each key's value, null for absent. */
type Kept = { v: 1; keys: Record<string, string | null> };

function emit(name: string) {
  try {
    window.dispatchEvent(new CustomEvent(name));
  } catch {
    /* ignore */
  }
}

function readKept(): Kept | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TESTERS_KEY) ?? "null") as Partial<Kept> | null;
    if (!parsed || parsed.v !== 1 || !parsed.keys || typeof parsed.keys !== "object") return null;
    return parsed as Kept;
  } catch {
    return null;
  }
}

/**
 * Begin a test: keep what the device holds, once. A second switch during the
 * same test keeps the first keeping, so "Back to my own" always goes back to
 * the reader's own answers and never to an earlier test's.
 */
export function startTesting(): void {
  if (typeof window === "undefined" || isTesting()) return;
  try {
    const keys: Record<string, string | null> = {};
    for (const key of TESTER_KEYS) keys[key] = window.localStorage.getItem(key);
    window.localStorage.setItem(TESTERS_KEY, JSON.stringify({ v: 1, keys } satisfies Kept));
  } catch {
    // Nothing could be kept, so nothing is switched.
    return;
  }
  emit(TESTERS_EVENT);
}

/**
 * See Purify as a reader from this background, at this familiarity: written
 * on this device only. A familiarity brings what it brings in the flow: the
 * register (depth) and the fast's default.
 */
export function testAs(change: { background?: Background; level?: Level }): void {
  startTesting();
  if (!isTesting()) return;
  if (change.background) writeBackground(change.background);
  if (change.level) {
    writeLevel(change.level);
    writeDepth(depthFor(change.level));
    writeFastingRule(defaultsFor(change.level).fasting);
    // The Day 1 card for this reader, where the device came through the flow.
    refreshDayOne();
  }
}

/**
 * "First open": the device as a new reader's, its answers and the flow's own
 * marks cleared, so home shows the welcome questions again
 * (components/onboarding/FirstRunGate.tsx).
 */
export function testFirstOpen(): void {
  startTesting();
  if (!isTesting()) return;
  try {
    for (const key of SPACE_KEYS) window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  emit(ONBOARDING_EVENT);
}

/**
 * "Back to my own": every key kept before the test, exactly as it was, and
 * the mode ended. The calendar's cookie, which the server reads, follows its
 * key back. False when there was no test to come back from.
 */
export function backToMyOwn(): boolean {
  if (typeof window === "undefined") return false;
  const kept = readKept();
  try {
    if (kept) {
      for (const [key, value] of Object.entries(kept.keys)) {
        if (value == null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, value);
      }
    }
    window.localStorage.removeItem(TESTERS_KEY);
  } catch {
    return false;
  }
  if (kept && CALENDAR_STYLE_KEY in kept.keys) {
    const style = kept.keys[CALENDAR_STYLE_KEY];
    try {
      document.cookie =
        style === "new" || style === "old"
          ? `${CALENDAR_STYLE_COOKIE}=${style}; Max-Age=31536000; Path=/; SameSite=Lax`
          : `${CALENDAR_STYLE_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    } catch {
      /* ignore */
    }
  }
  emit(ONBOARDING_EVENT);
  emit(CALENDAR_STYLE_EVENT);
  emit(TESTERS_EVENT);
  return kept != null;
}
