// "Your space": what the adaptive onboarding learns about a reader, and what
// Purify does with it. Pure and dependency free, so the rules are tested
// directly (lib/onboarding/__tests__/space.test.ts). Storage lives in
// ./state.ts; this file only decides.
//
// From the owner's specification of 2026-09-28 (Adaptive Onboarding Engine):
// a baseline fork of three levels, settings asked only of the practicing,
// one intent, and a handoff to a Day 1 step chosen for that reader.

import type { FastKind } from "@/lib/calendar/orthodox";

/** How familiar the reader is with Orthodox Christianity. */
export type Level = "inquirer" | "learning" | "practicing";
export const LEVELS: readonly Level[] = ["inquirer", "learning", "practicing"];

/** What they hope to focus on first. */
export type Intent = "quiet" | "liturgy" | "study" | "prayer";
export const INTENTS: readonly Intent[] = ["quiet", "liturgy", "study", "prayer"];

/**
 * How fasting shows. "strict" is the full rule as the calendar keeps it (and
 * what every reader saw before this existed, so it is the default). "modified"
 * shows each fast day plainly, as a day without meat or dairy, and leaves oil,
 * wine and fish to the reader's priest: the common core of Orthodox fasting,
 * without setting a rule of our own. "hidden" keeps fasting off Today.
 */
export type FastingRule = "strict" | "modified" | "hidden";
export const FASTING_RULES: readonly FastingRule[] = ["strict", "modified", "hidden"];

export type CalendarChoice = "new" | "old";

export function isLevel(v: unknown): v is Level {
  return typeof v === "string" && (LEVELS as readonly string[]).includes(v);
}
export function isIntent(v: unknown): v is Intent {
  return typeof v === "string" && (INTENTS as readonly string[]).includes(v);
}
export function isFastingRule(v: unknown): v is FastingRule {
  return typeof v === "string" && (FASTING_RULES as readonly string[]).includes(v);
}

/**
 * The settings a level implies. Only the practicing are asked about their
 * calendar and fast; everyone else starts on this baseline and can change it
 * in Settings. An inquirer starts on the Revised Julian calendar with fasting
 * out of the way, as the specification sets. Someone learning (attending the
 * Liturgy, or a catechumen) keeps the same calendar and sees fast days
 * plainly, since they are meeting them at church.
 */
export function defaultsFor(level: Level): { calendar: CalendarChoice; fasting: FastingRule } {
  switch (level) {
    case "inquirer":
      return { calendar: "new", fasting: "hidden" };
    case "learning":
      return { calendar: "new", fasting: "modified" };
    case "practicing":
      return { calendar: "new", fasting: "strict" };
  }
}

/** True when the level is asked the calendar and fasting questions. */
export function asksRule(level: Level | null): boolean {
  return level === "practicing";
}

/**
 * The register the rest of the app already reads (lib/onboarding/state.ts,
 * Depth). Beginners and catechumens get the introductory voice; the
 * practicing get the fuller one.
 */
export function depthFor(level: Level): "inquirer" | "faithful" {
  return level === "practicing" ? "faithful" : "inquirer";
}

export type DayOneKey =
  | "whatIsPrayer"
  | "jesusPrayer"
  | "prayerRope"
  | "trisagion"
  | "signOfCross"
  | "churchYear"
  | "gospelJohn"
  | "job"
  | "morningRule"
  | "morningPrayers";

/**
 * The first step the handoff offers, from what the reader told us. Every
 * destination is something Purify already has; the owner's specification
 * names guided walkthroughs (the Divine Liturgy for inquirers, Job for deep
 * study), which replace these as they are built.
 */
export function dayOneFor(level: Level | null, intent: Intent | null): { key: DayOneKey; href: string } {
  const beginner = level !== "practicing";
  switch (intent) {
    case "quiet":
      return beginner
        ? { key: "jesusPrayer", href: "/prayers/learning/jesus-prayer" }
        : { key: "prayerRope", href: "/prayers/rope" };
    case "liturgy":
      return level === "inquirer"
        ? { key: "signOfCross", href: "/prayers/learning/sign-of-the-cross" }
        : level === "learning"
          ? { key: "trisagion", href: "/prayers/learning/trisagion-prayers" }
          : { key: "churchYear", href: "/calendar" };
    case "study":
      return beginner
        ? { key: "gospelJohn", href: "/bible/john/1" }
        : { key: "job", href: "/bible/job/1" };
    case "prayer":
      return beginner
        ? { key: "morningRule", href: "/prayers/learning/morning-rule" }
        : { key: "morningPrayers", href: "/prayers/morning" };
    default:
      return level === "inquirer"
        ? { key: "whatIsPrayer", href: "/prayers/learning/what-is-prayer" }
        : { key: "gospelJohn", href: "/bible/john/1" };
  }
}

/**
 * The older "what draws you" picks (lib/onboarding/state.ts, Focus), kept in
 * step so surfaces that still read them point the same way.
 */
export function focusFor(intent: Intent): "scripture" | "prayer" | "saints" | "calendar" {
  switch (intent) {
    case "quiet":
    case "prayer":
      return "prayer";
    case "liturgy":
      return "calendar";
    case "study":
      return "scripture";
  }
}

/**
 * How today's fast shows under a rule. Null means it does not show. Under the
 * modified rule every kind of fast day reads the same plain line, and a day
 * without a fast reads as it always has.
 */
export function fastView(
  kind: FastKind,
  rule: FastingRule,
): { mode: "calendar" } | { mode: "plain" } | null {
  if (rule === "hidden") return null;
  if (rule === "modified" && kind !== "normal" && kind !== "fast-free") return { mode: "plain" };
  return { mode: "calendar" };
}
