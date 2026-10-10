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
 */
export const EVENING_FROM_HOUR = 17;

export type HourRuleId = "morning" | "evening";

export function ruleIdForHour(hour: number): HourRuleId {
  return hour >= EVENING_FROM_HOUR ? "evening" : "morning";
}
