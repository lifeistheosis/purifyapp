// First-run onboarding state, kept on the device (no account required).
//
// Follows the same localStorage + custom-event idiom as
// `lib/calendar/styleDefault.ts` so subscribers refresh in-tab without
// waiting on the cross-tab `storage` event. Hook-free on purpose so it can
// be imported anywhere; the only React surface is the small reader inside
// the onboarding components, which use `useEffect`.

import { NO_ANSWERS, isRole, parseClergyAnswers, type ClergyAnswers, type Role } from "./clergy";
import {
  cleanIntents,
  isBackground,
  isFastingRule,
  isIntent,
  isLevel,
  type Background,
  type FastingRule,
  type Intent,
  type Level,
} from "./space";
import { roadsEnabled } from "./flags";
import { SIGNED_OUT_PREVIEW_KEY, isTesting } from "./testing";
import { NEW_WEEK, localDay, parseWeek, type WeekState } from "./week";

/**
 * The flow a reader finished, stored when they finish it.
 *
 *   2  2026-09-28: the adaptive onboarding (sign in first, then the baseline
 *      fork, the rule for the practicing, one intent, the handoff).
 *   3  1.5.2, 2026-10-05: the same questions, asked of everyone again. The
 *      owner: "I want the onboarding to restart pretty much for everyone,
 *      even if they have an account." Most readers were never asked at all:
 *      anyone who had used Purify before 28 September was marked done
 *      without seeing a question (the prior-use check below), and so has no
 *      level, no intent and no Day 1.
 *
 * Only this version counts as onboarded now. Until 1.5.2 any finished version
 * did, and prior use counted as finished. A signed-in reader who is back is
 * still greeted differently, and nothing they have set is reset
 * (components/onboarding/FirstRunGate.tsx); they are no longer excused.
 */
export const ONBOARDING_VERSION = 3;
/** The first version that wrote the answers to the account (accountSync.ts). */
const FIRST_ACCOUNT_VERSION = 2;

const ONBOARDED_KEY = "purify:onboarded"; // stores the version number once done
const FOCUS_KEY = "purify:focus"; // JSON array of Focus ids
const DEPTH_KEY = "purify:depth"; // "inquirer" | "faithful"
const NUDGE_DISMISSED_KEY = "purify:firststeps.dismissed";
const NUDGE_ELIGIBLE_KEY = "purify:firststeps.eligible";
const LEVEL_KEY = "purify:level"; // Level
const INTENT_KEY = "purify:intent"; // Intent
const INTENTS_KEY = "purify:intents"; // JSON array of Intent, in the order tapped (1.8)
const FASTING_KEY = "purify:fasting-rule"; // FastingRule; absent = "strict"
const BACKGROUND_KEY = "purify:background"; // Background (1.8); absent = not asked or not answered
// "Are you a priest, a deacon, or a layman?" and a priest's or deacon's
// answers after it (1.8.x, ./clergy.ts). On this device only: never copied to
// the account's space and never counted, sent only inside a request for the
// clergy seal (./clergyRequest.ts), whose state is the third key.
const ROLE_KEY = "purify:role"; // Role; absent = not asked or not answered
const CLERGY_KEY = "purify:clergy"; // JSON ClergyAnswers
const CLERGY_REQUEST_KEY = "purify:clergy.request"; // JSON ClergyRequestState
// Set on the way into the sign-in step and cleared when the flow ends, so a
// Google or Apple sign-in, which leaves the page and comes back, resumes the
// questions instead of landing a brand-new account on an unasked Today.
const STAGE_KEY = "purify:onboarding.stage";
// "1" when the flow this reader finished was the one for a reader who is
// back. Their first step is then called a next step, not a Day 1.
const AGAIN_KEY = "purify:onboarding.again";
// The roads (1.9, ./flags.ts). "1" for a baptized Orthodox reader coming back
// after time away: practicing underneath, on the road back (./road.ts).
const RETURNING_KEY = "purify:returning";
// Where the reader stands in their first week (./week.ts, WeekState).
const WEEK_KEY = "purify:week";
// The day the questions were finished or skipped, the device's own
// (YYYY-MM-DD), so the one question a skip is offered later waits a day.
const ONBOARDED_DAY_KEY = "purify:onboarded.day";
// "1" once the one question offered after a skip is answered or closed.
const SECOND_CHANCE_KEY = "purify:secondchance.done";
// The card that offers an account and reminders after a first step:
// "asked" once the reader has gone to sign in from it, "done" once it is
// answered or closed.
const KEEP_KEY = "purify:keep";

/**
 * Every key above: the answers and the flow's own marks. Testers mode
 * (./testers.ts) keeps them as one before a test and puts them back exactly.
 */
export const SPACE_KEYS: readonly string[] = [
  ONBOARDED_KEY,
  FOCUS_KEY,
  DEPTH_KEY,
  NUDGE_DISMISSED_KEY,
  NUDGE_ELIGIBLE_KEY,
  LEVEL_KEY,
  INTENT_KEY,
  INTENTS_KEY,
  FASTING_KEY,
  BACKGROUND_KEY,
  ROLE_KEY,
  CLERGY_KEY,
  CLERGY_REQUEST_KEY,
  STAGE_KEY,
  AGAIN_KEY,
  RETURNING_KEY,
  WEEK_KEY,
  ONBOARDED_DAY_KEY,
  SECOND_CHANCE_KEY,
  KEEP_KEY,
  SIGNED_OUT_PREVIEW_KEY,
];

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
    return v != null && Number(v) >= ONBOARDING_VERSION;
  } catch {
    // Storage blocked → behave as onboarded so we never trap the user in a
    // loop they can't dismiss.
    return true;
  }
}

/**
 * Whether any version of the flow was finished on this device, the one this
 * build asks or an older one. A new install finishes it only after its first
 * open, so on that first open this is the sign of a reader who had an earlier
 * build (lib/whatsNew/tourState.ts, who is offered a release's tour).
 */
export function onboardedBefore(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(ONBOARDED_KEY);
    return v != null && Number(v) >= 1;
  } catch {
    return false;
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
  "purify:walk", // walked a chapter or opened a card (lib/walkthroughs)
];

/**
 * Has this device used Purify before? True when signed in
 * ("sb-<ref>-auth-token") or any genuine-engagement key is present. Until
 * 1.5.2 this excused a reader from the flow altogether. It excuses nobody
 * now, and is kept as the one description of what "has used Purify" means.
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

/**
 * Should the flow be shown to this visitor right now? Yes to anyone who has
 * not finished this version of it, a reader who is back included. Which way
 * in they get is the gate's to decide (components/onboarding/FirstRunGate).
 */
export function shouldShowOnboarding(): boolean {
  // Mid-flow across a sign-in redirect.
  if (readResumeStage()) return true;
  return !isOnboarded();
}

/**
 * Completed (or skipped) the flow. `again` for a reader who was back: it
 * changes only what their first step is called afterwards.
 */
export function markOnboarded(opts: { again?: boolean } = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ONBOARDED_KEY, String(ONBOARDING_VERSION));
    window.localStorage.setItem(NUDGE_ELIGIBLE_KEY, "1");
    window.localStorage.removeItem(STAGE_KEY);
    // A fresh Day 1 card for a fresh answer, and a first week from its first day.
    window.localStorage.removeItem(NUDGE_DISMISSED_KEY);
    window.localStorage.removeItem(WEEK_KEY);
    window.localStorage.setItem(ONBOARDED_DAY_KEY, localDay(new Date()));
    if (opts.again) window.localStorage.setItem(AGAIN_KEY, "1");
    else window.localStorage.removeItem(AGAIN_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/** The flow this reader finished was the one for a reader who is back. */
export function wasOnboardedAgain(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AGAIN_KEY) === "1";
  } catch {
    return false;
  }
}

// --- Resuming across a sign-in redirect --------------------------------

/**
 * Where the questions pick up after a sign-in that left the page.
 * "assessment": the account step was reached, so the first question.
 * "reminders": the reader asked for reminders without an account and was
 * sent to sign in (reminders are kept with an account, lib/push/wish.ts), so
 * straight back to the reminders, with what they asked for kept.
 */
export type ResumeStage = "assessment" | "reminders";

export function readResumeStage(): ResumeStage | null {
  if (typeof window === "undefined") return null;
  try {
    const stage = window.localStorage.getItem(STAGE_KEY);
    return stage === "assessment" || stage === "reminders" ? stage : null;
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

/**
 * Every answer to "What are you looking for?", in the order the reader tapped
 * them (1.8). The first is the intent (readIntent), which stays the one answer
 * the rest of Purify reads and counts; the list keeps the others behind it, in
 * their order. The intent always leads: one changed since in Settings comes
 * first here too, and no intent means no picks.
 */
export function readIntents(): Intent[] {
  const first = readIntent();
  if (!first) return [];
  let rest: Intent[] = [];
  try {
    rest = cleanIntents(JSON.parse(readString(INTENTS_KEY) ?? "[]"));
  } catch {
    /* junk under the key: the intent alone */
  }
  return [first, ...rest.filter((i) => i !== first)];
}

/** The picks in the order tapped. The first becomes the intent; none clears both. */
export function writeIntents(picks: readonly Intent[]): void {
  const clean = cleanIntents(picks);
  writeString(INTENTS_KEY, clean.length ? JSON.stringify(clean) : null);
  writeIntent(clean[0] ?? null);
}

/**
 * Where the reader comes from (1.8). Kept on the device and in the reader's
 * own account, for making Purify theirs; counted only as a total
 * (lib/onboarding/count.ts). "prefer-not" is an answer: they were asked.
 */
export function readBackground(): Background | null {
  const v = readString(BACKGROUND_KEY);
  return isBackground(v) ? v : null;
}
export function writeBackground(background: Background | null): void {
  writeString(BACKGROUND_KEY, background);
}

/** A priest, a deacon or a layman (1.8.x), as answered on this device. */
export function readRole(): Role | null {
  const v = readString(ROLE_KEY);
  return isRole(v) ? v : null;
}
export function writeRole(role: Role | null): void {
  writeString(ROLE_KEY, role);
}

/** Where a priest or deacon serves, their jurisdiction and parish, as answered on this device. */
export function readClergy(): ClergyAnswers {
  return parseClergyAnswers(readString(CLERGY_KEY));
}

/**
 * Kept as each is answered. A changed answer forgets that a request was
 * sent, so the next end of the questions asks again with what is true now
 * (./clergyRequest.ts reads the team's side first and never overwrites a
 * request already with them).
 */
export function writeClergy(answers: ClergyAnswers | null): void {
  const before = readString(CLERGY_KEY);
  const next = answers && JSON.stringify(answers) !== JSON.stringify(NO_ANSWERS) ? JSON.stringify(answers) : null;
  if (next !== before) writeString(CLERGY_REQUEST_KEY, null);
  writeString(CLERGY_KEY, next);
}

/**
 * Where the request for the clergy seal stands on this device: waiting to be
 * sent (signed out, or a send that failed at `tried`), or sent.
 */
export type ClergyRequestState = { state: "pending" | "sent"; tried?: number };

export function readClergyRequest(): ClergyRequestState | null {
  try {
    const r = JSON.parse(readString(CLERGY_REQUEST_KEY) ?? "null") as Partial<ClergyRequestState> | null;
    if (!r || (r.state !== "pending" && r.state !== "sent")) return null;
    return typeof r.tried === "number" && Number.isFinite(r.tried) ? { state: r.state, tried: r.tried } : { state: r.state };
  } catch {
    return null;
  }
}
export function writeClergyRequest(s: ClergyRequestState | null): void {
  writeString(CLERGY_REQUEST_KEY, s ? JSON.stringify(s) : null);
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
  // Testers mode: the device holds a test, and the account's answers stay out of it.
  if (isTesting()) return false;
  if (!remote || typeof remote !== "object") return false;
  const r = remote as Record<string, unknown>;
  if (!isLevel(r.level)) return false;
  if (readLevel() == null) writeLevel(r.level);
  // The picks behind the intent come with it (1.8); a copy from before then
  // holds the intent alone.
  if (readIntent() == null && isIntent(r.intent)) writeIntents([r.intent, ...cleanIntents(r.intents)]);
  if (readString(FASTING_KEY) == null && isFastingRule(r.fasting)) writeFastingRule(r.fasting);
  // With the roads on, where the reader comes from is kept on the device
  // alone (./accountSync.ts), so an older copy in the account is not taken.
  if (!roadsEnabled() && readBackground() == null && isBackground(r.background)) writeBackground(r.background);
  if (readString(RETURNING_KEY) == null && r.returning === true) writeReturning(true);
  return true;
}

/**
 * Whether the account's copy of the answers was given to THIS version of the
 * flow, on another device. Then this device takes them and asks nothing. A
 * copy with no version on it was written by version 2, before versions were
 * recorded; it is used to mark that reader's earlier answers, and they are
 * asked again.
 */
export function accountAnsweredThisVersion(remote: unknown): boolean {
  if (!remote || typeof remote !== "object") return false;
  const r = remote as Record<string, unknown>;
  if (!isLevel(r.level)) return false;
  const v = typeof r.v === "number" && Number.isFinite(r.v) ? r.v : FIRST_ACCOUNT_VERSION;
  return v >= ONBOARDING_VERSION;
}

/** The answers as one primitive, for useSyncExternalStore snapshots. */
export function spaceSnapshot(): string {
  return `${readLevel() ?? ""}|${readIntent() ?? ""}|${readFastingRule()}|${readBackground() ?? ""}|${readReturning() ? "1" : ""}|${readIntents().join(",")}`;
}

export function parseSpaceSnapshot(snapshot: string): {
  level: Level | null;
  intent: Intent | null;
  fasting: FastingRule;
  background: Background | null;
  /** Baptized Orthodox, coming back after time away (1.9). */
  returning: boolean;
  /** Every answer to "What are you looking for?", in the order tapped, the intent first. */
  intents: Intent[];
} {
  const [l, i, f, b, r, picks] = snapshot.split("|");
  return {
    level: isLevel(l) ? l : null,
    intent: isIntent(i) ? i : null,
    fasting: isFastingRule(f) ? f : "strict",
    background: isBackground(b) ? b : null,
    returning: r === "1",
    intents: cleanIntents((picks ?? "").split(",")),
  };
}

// --- The roads (1.9): the road back, the first week, the two cards -------

/** Baptized Orthodox and coming back after time away, as answered on this device. */
export function readReturning(): boolean {
  return readString(RETURNING_KEY) === "1";
}
export function writeReturning(returning: boolean): void {
  writeString(RETURNING_KEY, returning ? "1" : null);
}

/** Where the reader stands in their first week. */
export function readWeek(): WeekState {
  return typeof window === "undefined" ? NEW_WEEK : parseWeek(readString(WEEK_KEY));
}
export function writeWeek(week: WeekState): void {
  writeString(WEEK_KEY, JSON.stringify(week));
}
/** The week as one primitive, for useSyncExternalStore snapshots. */
export function weekSnapshot(): string {
  return readString(WEEK_KEY) ?? "";
}

/** The day the questions were finished or skipped (the device's own), or null for a device from before it was kept. */
export function readOnboardedDay(): string | null {
  const v = readString(ONBOARDED_DAY_KEY);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

/** The one question offered after a skip has been answered or closed. */
export function isSecondChanceDone(): boolean {
  return readString(SECOND_CHANCE_KEY) === "1";
}
export function markSecondChanceDone(): void {
  writeString(SECOND_CHANCE_KEY, "1");
}

/** The card that offers an account and reminders after a first step: untouched, gone to sign in, or finished with. */
export type KeepState = "open" | "asked" | "done";
export function readKeep(): KeepState {
  const v = readString(KEEP_KEY);
  return v === "asked" || v === "done" ? v : "open";
}
export function writeKeep(state: KeepState): void {
  writeString(KEEP_KEY, state === "open" ? null : state);
}

/**
 * Marked done without seeing the flow or the nudge: a reader who answered
 * this version on another device.
 */
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
