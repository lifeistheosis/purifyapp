// What the onboarding counts, as closed lists (1.8). The owner, 2026-10-26:
// "we need to track the onboarding system. What gets clicked, how many people
// go through certain routes, how many Roman Catholics come, how many
// Protestants come ... ASAP so we can tailor the updates."
//
// Every count is a total in analytics_events (/api/track/event): an event's
// name and a few words from these lists, never a session, an account or an
// address, and the day only, not the time. "A Catholic finished" is one more
// on a total. The server takes nothing that is not on these lists
// (lib/security/schemas.ts, trackEventSchema), so no identifier can arrive
// dressed as an answer.
//
// Pure, so the rules are tested directly (lib/onboarding/__tests__/counting.test.ts).
// Sending is lib/onboarding/count.ts.

import { BACKGROUNDS, FASTING_RULES, INTENTS, LEVELS, type Background, type Intent, type Level } from "./space";

/** Raise with the questions: a count says which version of them it answers. */
export const COUNT_VERSION = 3;

export const ONBOARDING_STEPS = [
  "welcome",
  "returning",
  "account",
  "background",
  "level",
  "rule",
  "intent",
  "reminders",
  "handoff",
] as const;
export type CountStep = (typeof ONBOARDING_STEPS)[number];

/** The way in (components/onboarding/FirstRunGate.tsx), in plain words. */
export const COUNT_ROUTES = ["new", "signup", "signed-in", "returning"] as const;
export type CountRoute = (typeof COUNT_ROUTES)[number];

export const COUNT_PLATFORMS = ["ios", "android", "web", "desktop"] as const;
export type CountPlatform = (typeof COUNT_PLATFORMS)[number];

/** Each question and the answers it can be given. */
export const COUNT_ANSWERS = {
  background: BACKGROUNDS,
  level: LEVELS,
  calendar: ["new", "old"],
  fasting: FASTING_RULES,
  intent: INTENTS,
  reminders: ["on", "blocked", "unsupported", "failed", "not-now"],
  account: ["signed-in", "without"],
} as const satisfies Record<string, readonly string[]>;
export type CountQuestion = keyof typeof COUNT_ANSWERS;
export const COUNT_QUESTIONS = Object.keys(COUNT_ANSWERS) as CountQuestion[];

export function isCountAnswer(question: CountQuestion, answer: string): boolean {
  return (COUNT_ANSWERS[question] as readonly string[]).includes(answer);
}

/**
 * The body the device sends for a count: the event as the flow names it,
 * with the version of the questions, the kind of device and the door it came
 * by. One function for the device and its test, so what is sent is exactly
 * what the server's closed list is tested to take.
 */
export function eventBody(
  event: { name: string; props: Record<string, unknown> },
  about: { v: number; platform: CountPlatform; door?: string },
): string {
  return JSON.stringify({
    name: event.name,
    props: { ...event.props, v: about.v, platform: about.platform, ...(about.door ? { door: about.door } : {}) },
  });
}

/** The days on which a reader who finished is counted as having come back. */
export const RETURN_DAYS = [2, 7, 30] as const;
export type ReturnDay = (typeof RETURN_DAYS)[number];

/** The flow's starting point, as the route it counts under. */
export function routeFor(start: "welcome" | "account" | "level" | "returning"): CountRoute {
  switch (start) {
    case "welcome":
      return "new";
    case "account":
      return "signup";
    case "level":
      return "signed-in";
    case "returning":
      return "returning";
  }
}

/**
 * What this device keeps about the flow it finished, so that it can say on
 * its day 2, 7 and 30 that it came back, with the answers it gave, and the
 * server never joins two visits. Kept on the device only.
 */
export type FinishedRecord = {
  /** The day the flow was finished, YYYY-MM-DD in UTC. */
  at: string;
  v: number;
  route: CountRoute;
  door?: string;
  background?: Background;
  level?: Level;
  intent?: Intent;
  /** The return days already counted. */
  sent: ReturnDay[];
};

/** YYYY-MM-DD in UTC. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Whole days from one YYYY-MM-DD to another. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/**
 * The return days to count now: every one reached and not yet sent. A reader
 * who first comes back on day 9 is counted for day 2 and day 7 at once, so the
 * totals read "came back after two days or more", "after a week or more".
 */
export function returnsDue(record: FinishedRecord, today: string): ReturnDay[] {
  const days = daysBetween(record.at, today);
  return RETURN_DAYS.filter((d) => days >= d && !record.sent.includes(d));
}

/** A record read back from storage, or null when it is not one. */
export function parseFinishedRecord(raw: string | null): FinishedRecord | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Partial<FinishedRecord>;
    if (typeof r.at !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.at)) return null;
    if (typeof r.v !== "number" || !(COUNT_ROUTES as readonly string[]).includes(r.route as string)) return null;
    const sent = Array.isArray(r.sent) ? r.sent.filter((d): d is ReturnDay => (RETURN_DAYS as readonly number[]).includes(d)) : [];
    return { ...(r as FinishedRecord), sent };
  } catch {
    return null;
  }
}
