// A day of a reader's first week, kept on its page (2.0; ./dayFrame.ts says
// which days are, and how: by the reader's Done at the page's end, or by the
// page's own end).
//
// Kept once, however often it is asked. A second tap that lands while the
// first is still being pictured, a prayer's end told twice, an effect run
// again: each asks to keep the same day, and a day kept twice would take a
// second step off the week without the reader having seen it. So the step is
// taken only while it is still the one waiting today.

import { countWeekStep } from "@/lib/analytics/moreCount";

import { dayFrameEnabled, roadsEnabled } from "./flags";
import { leanOf, roadOf } from "./road";
import { isNudgeEligible, readBackground, readIntent, readIntents, readLevel, readReturning, readWeek, writeWeek } from "./state";
import { localDay, stepTaken, stepToday, weekFor, type WeekStepKey } from "./week";

/** Keep today's step, if it is `index` and still waiting. Answers whether this call kept it. */
export function keepDay(index: number, now: Date = new Date()): boolean {
  const today = localDay(now);
  const week = readWeek();
  if (stepToday(week, today) !== index) return false;
  writeWeek(stepTaken(week, today));
  countWeekStep(index + 1, "kept");
  return true;
}

/**
 * Keep today's step when it is the one named, wherever the reader is. For an act that ends on
 * another page than the one the day opens: today's readings are opened from their list and read,
 * one after another, in the Bible's reader, where their own Done is. Read from the device as the
 * card on Today reads it (./useWeek.ts), and only with the frame on, so nothing changes for a
 * reader without it. Answers whether this call kept it.
 */
export function keepDayOf(key: WeekStepKey, now: Date = new Date()): boolean {
  if (typeof window === "undefined" || !roadsEnabled() || !isNudgeEligible() || !dayFrameEnabled()) return false;
  const intent = readIntent();
  const level = readLevel();
  const road = roadOf({ background: readBackground(), level, intent, returning: readReturning() });
  if (!road) return false;
  const index = stepToday(readWeek(), localDay(now));
  if (index == null) return false;
  const week = weekFor({ road, lean: leanOf(intent), level, picks: readIntents() });
  return week[index]?.key === key ? keepDay(index, now) : false;
}
