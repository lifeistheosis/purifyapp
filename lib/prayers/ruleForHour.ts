/**
 * Which daily rule the hour calls for: the Morning Rule until five in the
 * afternoon, the Evening Rule from then on.
 *
 * One answer for every surface that says "pray now". The Today screen's
 * Pray now card named the Morning Rule at every hour, under a "Good evening"
 * greeting, because it never asked; the Prayers page asked and got it right.
 *
 * Deliberately NOT aligned with useDailyRhythm's hour<12 split, which is
 * answering a different question (which rule to file a mark under).
 *
 * EVENING_FROM_HOUR is also where evening starts on every other screen that
 * reads the clock (the owner's decision, 2026-10-10): the greeting on Today
 * and on Prayers, the line under the Prayers masthead, the Pray now row and
 * the streak sheet's Pray button. Four of them each carried an hour of their
 * own, 16, 17, 18 and 19, so one reader could be wished a good afternoon
 * above the Evening Rule. A screen that needs to know whether it is evening
 * imports this; it does not write the number again.
 * lib/prayers/__tests__/ruleForHour.test.ts reads those files and fails when
 * one compares the clock against a late hour of its own, or moves this one by
 * an offset. It reads text, so it is a net and not a proof: what it cannot
 * see is written above its source guard.
 */
export const EVENING_FROM_HOUR = 17;

export type HourRuleId = "morning" | "evening";

export function ruleIdForHour(hour: number): HourRuleId {
  return hour >= EVENING_FROM_HOUR ? "evening" : "morning";
}
