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

/** Where the flow begins (components/onboarding/OnboardingFlow.tsx, OnboardingStart). */
export type FlowStart = "welcome" | "account" | "level" | "returning";

function head(startAt: FlowStart): StepId[] {
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
 * reminders that are on.
 */
export function flowSteps(o: {
  startAt: FlowStart;
  level: Level | null;
  role: Role | null;
  country: string | null;
  remindersOn: boolean;
}): StepId[] {
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

/**
 * What the progress line is measured against: the longest way through, a
 * US priest's, with every screen anyone can be shown, so the line only ever
 * grows. Choosing "Practicing" adds screens, and counting against the live
 * list would pull the line back just as the reader moved forward; everyone
 * else skips those segments in one longer stride.
 */
export function progressPath(startAt: FlowStart): StepId[] {
  return [
    ...head(startAt),
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
