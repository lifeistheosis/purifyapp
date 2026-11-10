// The welcome questions' screens, in order, for one reader: which ones they
// are asked follows from where they came in and what they have answered so
// far. Kept here, pure, so the branches are tested directly
// (lib/onboarding/__tests__/flowSteps.test.ts); the screens themselves are
// components/onboarding/OnboardingFlow.tsx.

import { asksClergy, clergySteps, type ClergyStep, type Role } from "./clergy";
import { asksRule, type Level } from "./space";

export type StepId =
  | "welcome"
  | "returning"
  | "account"
  | "background"
  | "level"
  | "role"
  | ClergyStep
  | "rule"
  | "intent"
  | "reminders"
  | "handoff";

/**
 * Where the flow begins (components/onboarding/OnboardingFlow.tsx,
 * OnboardingStart). "reminders" is a reader coming back from the sign-in the
 * reminders step sent them to: every question before it is answered already.
 */
export type FlowStart = "welcome" | "account" | "level" | "returning" | "reminders";

function head(startAt: Exclude<FlowStart, "reminders">): StepId[] {
  switch (startAt) {
    case "level":
      return [];
    case "returning":
      return ["returning"];
    case "account":
      return ["account"];
    case "welcome":
      return ["welcome", "account"];
  }
}

/**
 * The screens this reader is shown. The baptized Orthodox are asked whether
 * they are clergy (1.8.x) and, after it, their calendar and fast; a priest or
 * deacon is asked where they serve, their jurisdiction, and in the United
 * States their parish. A reader who is back is not asked to turn on
 * reminders that are on. A reader back from signing in for their reminders
 * is shown the reminders and the end, and nothing they have answered again.
 *
 * With the roads on (1.9, ./flags.ts) the questions are fewer, and each is
 * asked where it is of use (docs/1.9-build/notes/onboarding-fable.md, 3.2):
 *
 *   - no account step for a new reader: Purify is shown before it asks for
 *     anything, and the account is offered on Today after a first step
 *     (components/onboarding/KeepCard.tsx). The mobile website still begins
 *     at it, since there the reader came to make an account;
 *   - reminders are asked in the questions only of a reader who is signed
 *     in, since they are kept with an account: asked of anyone else, the
 *     answer "yes" would send them out of the questions to sign in. The same
 *     card offers them with the account;
 *   - the clergy's question is not a screen every practicing reader passes:
 *     a quiet line on the rule's screen opens it (`clergyOpen`), and its
 *     screens then follow the rule.
 */
export function flowSteps(o: {
  startAt: FlowStart;
  level: Level | null;
  role: Role | null;
  country: string | null;
  remindersOn: boolean;
  /** The roads are on (./flags.ts). Off, the questions are as they have been since 1.8.x. */
  roads?: boolean;
  /** Roads only: someone is signed in on this device. */
  signedIn?: boolean;
  /** Roads only: the reader tapped "I am a priest or deacon" on the rule's screen. */
  clergyOpen?: boolean;
  /**
   * Roads only: this device is in the version of the account's test that
   * asks for an account as the last question (lib/ab/tests.ts,
   * ACCOUNT_PLACE, "end"), where the other offers it on Today.
   */
  accountAtEnd?: boolean;
}): StepId[] {
  if (o.startAt === "reminders") return ["reminders", "handoff"];
  if (o.roads) {
    return [
      ...roadsHead(o.startAt),
      "background",
      "level",
      ...(asksRule(o.level) ? (["rule"] as StepId[]) : []),
      ...(asksClergy(o.level) && o.clergyOpen ? (["role", ...clergySteps(o.role, o.country)] as StepId[]) : []),
      "intent",
      // Never where the questions began at the account (the mobile website).
      ...(o.accountAtEnd && !o.signedIn && o.startAt !== "account" ? (["account"] as StepId[]) : []),
      ...(o.signedIn && !(o.startAt === "returning" && o.remindersOn) ? (["reminders"] as StepId[]) : []),
      "handoff",
    ];
  }
  return [
    ...head(o.startAt),
    "background",
    "level",
    ...(asksClergy(o.level) ? (["role", ...clergySteps(o.role, o.country)] as StepId[]) : []),
    ...(asksRule(o.level) ? (["rule"] as StepId[]) : []),
    "intent",
    ...(o.startAt === "returning" && o.remindersOn ? [] : (["reminders"] as StepId[])),
    "handoff",
  ];
}

/** The way in with the roads on: a new reader's welcome is not followed by the account step. */
function roadsHead(startAt: Exclude<FlowStart, "reminders">): StepId[] {
  return startAt === "welcome" ? ["welcome"] : head(startAt);
}

/**
 * What the progress line is measured against: the longest way through, a
 * US priest's, with every screen anyone can be shown, so the line only ever
 * grows. Choosing "Practicing" adds screens, and counting against the live
 * list would pull the line back just as the reader moved forward; everyone
 * else skips those segments in one longer stride. A reader back from signing
 * in for their reminders is measured as one who was signed in already, so
 * the line stands where they left it, near its end.
 */
export function progressPath(startAt: FlowStart, roads = false): StepId[] {
  const from = startAt === "reminders" ? "level" : startAt;
  if (roads) {
    // The rule comes before the clergy's screens here, as flowSteps has them.
    return [
      ...roadsHead(from),
      "background",
      "level",
      "rule",
      "role",
      "clergyWhere",
      "clergyJurisdiction",
      "clergyParish",
      "intent",
      // The account as the last question (one version of the account's test).
      // Where the questions began at it, it is in the head and not here.
      ...(from === "account" ? [] : (["account"] as StepId[])),
      "reminders",
      "handoff",
    ];
  }
  return [
    ...head(from),
    "background",
    "level",
    "role",
    "clergyWhere",
    "clergyJurisdiction",
    "clergyParish",
    "rule",
    "intent",
    "reminders",
    "handoff",
  ];
}
