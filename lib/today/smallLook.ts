import type { ReaderType } from "@/lib/onboarding/readerType";

/**
 * Your first Liturgy and Today's Catechism on Today (1.8): the owner's round
 * 17, TRANSITIONARY, "A and B" (Homebase/boards/purify-master/r18/choose/
 * 17b-transitionary.png). One look for each type of reader, from the
 * reader's own answer (lib/onboarding/readerType.ts), never a guess:
 *
 *   orthodox          A, quiet lines: each a single line under the day's
 *                     word, a hairline above and below.
 *   learning and new  B, two cards, each with its own door.
 *
 * Only the look changes. Each still shows on the same days and under the
 * same conditions as before: the reminder in the week of the Liturgy the
 * reader chose in the guide (lib/start/liturgyPlan.ts), the Catechism while
 * the bank holds questions (lib/catechism/bank.ts).
 */
export type SmallLook = "line" | "card";

export function smallLook(type: ReaderType): SmallLook {
  return type === "orthodox" ? "line" : "card";
}
