// The road (1.9): where a reader comes in from, beside how far along they are.
//
// The reader's type (./readerType.ts) says how far along a reader is, and
// decides how Today looks. The road says where they come from, and decides
// what they meet first: their first week (./week.ts). Two facts, kept apart:
// a Catholic catechumen is "learning" on the catechumen's road, a baptized
// Orthodox who stopped going is "orthodox" on the road back.
//
// The rule that keeps a road from becoming a different faith for each reader
// (docs/1.9-build/notes/onboarding-fable.md, 3.0): no page of content knows
// who is reading it. A road changes the order things are met in and the first
// step, never what a council, a saint or a prayer says. Every road outside
// the practicing ends at the same door: a parish, and a first Liturgy.
//
// Read from what the reader said, never guessed: no answers, no road, and
// Purify as it always was. Pure, so the rule is tested directly
// (lib/onboarding/__tests__/road.test.ts).

import type { Background, Intent, Level } from "./space";

export type Road =
  | "practicing"
  | "returning"
  | "catechumen"
  | "catholic"
  | "protestant"
  | "christian"
  | "seeker"
  | "newcomer";

export const ROADS: readonly Road[] = [
  "practicing",
  "returning",
  "catechumen",
  "catholic",
  "protestant",
  "christian",
  "seeker",
  "newcomer",
];

/**
 * The one split inside a road. A reader from a liturgical church (Anglican,
 * Lutheran, Methodist) knows a creed, a calendar and a sacrament; a reader
 * from a Bible church comes in by Scripture alone. Not asked: read from what
 * they said they were looking for.
 */
export type Lean = "liturgical" | "bible";

/** The answers that say a reader came for the early Church itself. */
const EARLY_CHURCH: readonly Intent[] = ["fathers", "councils", "history"];
/** The answers that say a Protestant reader knows a church with a liturgy and a calendar. */
const LITURGICAL: readonly Intent[] = ["liturgy", "fathers", "councils", "history", "feasts", "saints"];

export type RoadAnswers = {
  background: Background | null;
  level: Level | null;
  /** The first answer to "What are you looking for?", if any. */
  intent: Intent | null;
  /** Baptized Orthodox and coming back after time away (./state.ts, readReturning). */
  returning: boolean;
};

/**
 * The reader's road, or null when they have said nothing to choose one by.
 *
 * What they said of their own practice comes first, as it does for the
 * reader's type: the practicing are on their own road or the road back, and
 * anyone going to the services is a catechumen's, wherever they came from.
 * Then where they come from. "Just curious" and "Prefer not to say" are the
 * early-church seeker's road when the Fathers, the councils or history were
 * the first thing they asked for, and the newcomer's otherwise.
 */
export function roadOf(a: RoadAnswers): Road | null {
  if (a.level === "practicing") return a.returning ? "returning" : "practicing";
  if (a.level === "learning") return "catechumen";
  switch (a.background) {
    case "catholic":
      return "catholic";
    case "protestant":
      return "protestant";
    case "christian":
      return "christian";
    case "other-faith":
      return "newcomer";
    case "orthodox":
      // Orthodox by family and new to the faith: the road back. With no
      // level at all (a skip), Purify as it always was.
      return a.level === "inquirer" ? "returning" : null;
    case "none":
      return a.intent && EARLY_CHURCH.includes(a.intent) ? "seeker" : "newcomer";
    default:
      // Prefer not to say, or never asked: a road only if they said they are new.
      if (a.level !== "inquirer") return null;
      return a.intent && EARLY_CHURCH.includes(a.intent) ? "seeker" : "newcomer";
  }
}

/** A Protestant reader's lean, from their first answer. Scripture when they gave none. */
export function leanOf(intent: Intent | null): Lean {
  return intent && LITURGICAL.includes(intent) ? "liturgical" : "bible";
}
