// First-run onboarding state, kept on the device (no account required).
//
// Follows the same localStorage + custom-event idiom as
// `lib/calendar/styleDefault.ts` so subscribers refresh in-tab without
// waiting on the cross-tab `storage` event. Hook-free on purpose so it can
// be imported anywhere; the only React surface is the small reader inside
// the onboarding components, which use `useEffect`.

import {
  isFastingRule,
  isIntent,
  isLevel,
  type FastingRule,
  type Intent,
  type Level,
} from "./space";

/**
 * The flow a reader finished, stored when they finish it. 2 since 2026-09-28:
 * the adaptive onboarding (sign in first, then the baseline fork, the rule for
 * the practicing, one intent, the handoff).
 *
 * Any finished version counts as onboarded (FIRST_VERSION below). A reader
 * who went through version 1 has told us enough to be left alone; asking
 * again would interrupt someone whose only use so far is outside the
 * prior-use allowlist, reading saints or the calendar, say.
 */
export const ONBOARDING_VERSION = 2;
const FIRST_VERSION = 1;

const ONBOARDED_KEY = "purify:onboarded"; // stores the version number once done
const FOCUS_KEY = "purify:focus"; // JSON array of Focus ids
const DEPTH_KEY = "purify:depth"; // "inquirer" | "faithful"
const NUDGE_DISMISSED_KEY = "purify:firststeps.dismissed";
const NUDGE_ELIGIBLE_KEY = "purify:firststeps.eligible";
const LEVEL_KEY = "purify:level"; // Level
const INTENT_KEY = "purify:intent"; // Intent
const FASTING_KEY = "purify:fasting-rule"; // FastingRule; absent = "strict"
// Set on the way into the sign-in step and cleared when the flow ends, so a
// Google or Apple sign-in, which leaves the page and comes back, resumes the
// questions instead of landing a brand-new account on an unasked Today.
const STAGE_KEY = "purify:onboarding.stage";

/** Fired in-tab whenever onboarding state changes. */
export const ONBOARDING_EVENT = "purify:onboarding";

export type Focus = "scripture" | "prayer" | "saints" | "calendar";
const FOCUS_VALUES: readonly Focus[] = [
  "scripture",
  "prayer",
  "saints",
  "calendar",
];

function emit() {
  try {
    window.dispatchEvent(new CustomEvent(ONBOARDING_EVENT));
  } catch {
    /* ignore */
  }
}

export function isOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(ONBOARDED_KEY);
    return v != null && Number(v) >= FIRST_VERSION;
  } catch {
    // Storage blocked → behave as onboarded so we never trap the user in a
    // loop they can't dismiss.
    return true;
  }
}

// Prefixes of localStorage keys that only exist once a user has actually
// engaged — saved something, changed a preference, read, or prayed. We match
// against these (an allowlist) rather than sweeping every `purify*` key,
// because the app writes incidental bookkeeping on a brand-new visit too
// (`purify_install_visits`, analytics ids, our own onboarding flags). A
// deterministic allowlist avoids racing those.
const PRIOR_USE_PREFIXES: readonly string[] = [
  "purify:bookmark", // saved a verse/passage
  "purify:annotation", // highlighted or noted
  "purify:calendar.style", // chose a calendar reckoning
  "purify.today.goals", // used the daily goals
  "purify:today-goals",
  "purify.reader.", // changed reader prefs / read positions
  "purify:reader-prefs",
  "purify.bible.", // opened the Bible reader
  "purify:bible:",
  "purify:reading-history",
  "purify.prayers.", // prayed
  "purify:prayer-",
  "purify.rope.",
  "purify:rope",
  "purify:florileg", // built a florilegium
  "purify:intentions",
  "purify.ambience.", // changed ambience
  "purify_local_account", // claimed a local account
  "purify:local-account",
  "purify:whatsNewSeen", // saw a prior release's notes
  "purify:catechism", // completed a day's catechism
];

/**
 * Has this device used Purify before? True when signed in
 * ("sb-<ref>-auth-token") or any genuine-engagement key is present. Such a
 * returning user must NOT be interrupted with first-run onboarding.
 */
export function priorUseDetected(): boolean {
  if (typeof window === "undefined") return true;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("sb-") && key.endsWith("-auth-token")) return true;
      if (PRIOR_USE_PREFIXES.some((p) => key.startsWith(p))) return true;
    }
    return false;
  } catch {
    return true;
  }
}

/** Should the first-run flow be shown to this visitor right now? */
export function shouldShowOnboarding(): boolean {
  // Mid-flow across a sign-in redirect: the auth token now counts as prior
  // use, so this has to be asked first.
  if (readResumeStage()) return true;
  if (isOnboarded()) return false;
  if (priorUseDetected()) {
    // Returning user who predates onboarding: mark done quietly so we never
    // scan again, and never show them the flow or the first-step nudge.
    markOnboardedSilently();
    return false;
  }
  return true;
}

/** Completed (or skipped) the real flow as a genuine new user. */
export function markOnboarded(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDED_KEY, String(ONBOARDING_VERSION));
    window.localStorage.setItem(NUDGE_ELIGIBLE_KEY, "1");
    window.localStorage.removeItem(STAGE_KEY);
    // A fresh Day 1 card for a fresh answer.
    window.localStorage.removeItem(NUDGE_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

// --- Resuming across a sign-in redirect --------------------------------

export type ResumeStage = "assessment";

export function readResumeStage(): ResumeStage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STAGE_KEY) === "assessment" ? "assessment" : null;
  } catch {
    return null;
  }
}

export function setResumeStage(stage: ResumeStage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STAGE_KEY, stage);
  } catch {
    /* ignore */
  }
}

export function clearResumeStage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STAGE_KEY);
  } catch {
    /* ignore */
  }
}

// --- Your space: level, intent, fasting rule ----------------------------

function readString(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeString(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
  emit();
}

export function readLevel(): Level | null {
  const v = readString(LEVEL_KEY);
  return isLevel(v) ? v : null;
}
export function writeLevel(level: Level | null): void {
  writeString(LEVEL_KEY, level);
}

export function readIntent(): Intent | null {
  const v = readString(INTENT_KEY);
  return isIntent(v) ? v : null;
}
export function writeIntent(intent: Intent | null): void {
  writeString(INTENT_KEY, intent);
}

/** "strict" when never set, which is how fasting showed before the choice existed. */
export function readFastingRule(): FastingRule {
  const v = readString(FASTING_KEY);
  return isFastingRule(v) ? v : "strict";
}
export function writeFastingRule(rule: FastingRule): void {
  writeString(FASTING_KEY, rule);
}

/**
 * The account's copy of the answers (user_metadata.purify_space, written by
 * ./accountSync.ts), taken only where this device has none: an answer given
 * here is never overwritten by an older one from elsewhere, the same rule
 * lib/profile/preferences.ts keeps for focus and depth. True when the account
 * holds an answered space, so a caller can spare the reader the questions.
 */
export function fillSpaceFromAccount(remote: unknown): boolean {
  if (!remote || typeof remote !== "object") return false;
  const r = remote as Record<string, unknown>;
  if (!isLevel(r.level)) return false;
  if (readLevel() == null) writeLevel(r.level);
  if (readIntent() == null && isIntent(r.intent)) writeIntent(r.intent);
  if (readString(FASTING_KEY) == null && isFastingRule(r.fasting)) writeFastingRule(r.fasting);
  return true;
}

/** The three answers as one primitive, for useSyncExternalStore snapshots. */
export function spaceSnapshot(): string {
  return `${readLevel() ?? ""}|${readIntent() ?? ""}|${readFastingRule()}`;
}

export function parseSpaceSnapshot(snapshot: string): {
  level: Level | null;
  intent: Intent | null;
  fasting: FastingRule;
} {
  const [l, i, f] = snapshot.split("|");
  return {
    level: isLevel(l) ? l : null,
    intent: isIntent(i) ? i : null,
    fasting: isFastingRule(f) ? f : "strict",
  };
}

/** Existing user, marked done without ever seeing the flow or the nudge. */
export function markOnboardedSilently(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDED_KEY, String(ONBOARDING_VERSION));
  } catch {
    /* ignore */
  }
  emit();
}

export function readFocus(): Focus[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FOCUS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is Focus =>
      FOCUS_VALUES.includes(x as Focus),
    );
  } catch {
    return [];
  }
}

export function writeFocus(focus: Focus[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FOCUS_KEY, JSON.stringify(focus));
  } catch {
    /* ignore */
  }
  emit();
}

/**
 * How much the reader already knows, which decides REGISTER and nothing else:
 * the same saint introduced as "who was St Mary of Egypt" or as her Life in
 * Sophronius' own words. Never used to withhold content.
 *
 * Null is "not answered" and is deliberately distinct from "inquirer": a
 * reader who skipped the question has not told us they are a beginner.
 */
export type Depth = "inquirer" | "faithful";
const DEPTH_VALUES: readonly Depth[] = ["inquirer", "faithful"];

export function readDepth(): Depth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEPTH_KEY);
    return DEPTH_VALUES.includes(raw as Depth) ? (raw as Depth) : null;
  } catch {
    return null;
  }
}

export function writeDepth(depth: Depth | null): void {
  if (typeof window === "undefined") return;
  try {
    if (depth) window.localStorage.setItem(DEPTH_KEY, depth);
    else window.localStorage.removeItem(DEPTH_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

// --- First-step nudge (Today) -------------------------------------------

export function isNudgeEligible(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(NUDGE_ELIGIBLE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isNudgeDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(NUDGE_DISMISSED_KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * A changed answer in Settings brings the Day 1 card back with the new first
 * step. Only for readers who came through the flow: a long-time reader who
 * was marked done silently never gets a "Day 1".
 */
export function refreshDayOne(): void {
  if (!isNudgeEligible()) return;
  try {
    window.localStorage.removeItem(NUDGE_DISMISSED_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function dismissNudge(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NUDGE_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
  emit();
}
