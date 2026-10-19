// What the guide's cards and sheets share: a card's short name, and what an
// open "why" sheet holds. Its own file so the guide and its sheets need not
// import each other.

import { PARTS, WORDS, type Why } from "@/lib/start/firstLiturgy";
import type { StepId } from "@/lib/start/liturgyPlan";

/** A card's short name, for where the reader is and for what comes next. */
export function stepName(step: StepId, t: (key: string) => string): string {
  switch (step) {
    case "intro":
      return t(WORDS.title.key);
    case "kind":
      return t(WORDS.step.kind.key);
    case "when":
      return t(WORDS.step.when.key);
    case "customs":
      return t(WORDS.step.customs.key);
    case "ready":
      return t(WORDS.ready.title.key);
    default:
      return t(PARTS[step].title.key);
  }
}

/** What a "why" sheet shows: its heading and what the line rests on. */
export type OpenWhy = { title: string; why: Why };
