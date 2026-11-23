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

import { readWeek, writeWeek } from "./state";
import { localDay, stepTaken, stepToday } from "./week";

/** Keep today's step, if it is `index` and still waiting. Answers whether this call kept it. */
export function keepDay(index: number, now: Date = new Date()): boolean {
  const today = localDay(now);
  const week = readWeek();
  if (stepToday(week, today) !== index) return false;
  writeWeek(stepTaken(week, today));
  countWeekStep(index + 1, "kept");
  return true;
}
