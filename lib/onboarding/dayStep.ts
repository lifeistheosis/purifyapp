// A step that leads into the Church's own day (2.0, with the day's frame;
// the owner's "do all" of 2026-11-23, to one pick for each day that opened a
// list or a hub).
//
// Two steps of a first week name the day itself, and each opened a page with
// no one thing to do and no end to reach. Today's readings opened the day's
// prayers, where on a phone the readings are not shown at all; the Church's
// year opened the calendar. With the frame each leads into the day:
//
//   readings    the day's readings, read one after another in the Bible's
//               reader, where their own bar says where the reader is and ends
//               on "Done" (lib/readings/flow.ts, components/bible/
//               ReadingsFlowBar.tsx). That Done keeps the day. The card on
//               Today starts the walk and opens the first of them; its line
//               is the one the app already says of that walk, since the
//               step's own promised the saint and the fast as well. The walk
//               is on no page of its own, so the day is found by no page:
//               the step keeps the address it had, and nothing mounted on
//               that page, or on a chapter, can take it for its own day.
//   churchYear  the page of who leads the day, as the calendar names them
//               (lib/calendar/useChurchDay.ts, headlineSaint): a saint's own
//               page, with "Done for today" at its end as on any saint's day.
//               The card keeps the step's name and says no line under it:
//               the step's own line promised the fast, the readings and the
//               feasts ahead, and Today already names the day's saint once.
//
// A day with nothing to lead into stays as it was, taken when it is opened,
// so no reader is left on a day that cannot be kept: a day with no readings;
// a day whose lead has no page in the app (most days of the year have none
// yet); and a day whose lead's page is already a day of the reader's own
// week, since no page comes twice.
//
// Which day it is, is the device's and never the server's (an export would
// bake the build's day in), so a step is led into the day where it is read
// for the frame (./useWeek.ts, useWeekDay). Pure here.

import type { WeekStep } from "./week";

/** What of the Church's day a step can lead into: how many readings the day has, and the page of who leads it. */
export type ChurchToday = { readings: number; saint: string | null };

/** The line the app already says of the day's readings read as one walk (the Bible's sheet). */
export const READINGS_LINE = "readingsFlow.startValue";

/** Whether this step names the Church's own day, so that what it opens is decided on the day. */
export function leadsIntoDay(step: WeekStep): boolean {
  return step.key === "readings" || step.key === "churchYear";
}

/**
 * The step as the day opens it. `week` is the reader's seven, so that the
 * lead's page is not one they are given on another day.
 */
export function stepOnDay(step: WeekStep, on: ChurchToday | null, week: readonly WeekStep[] = []): WeekStep {
  if (!on) return step;
  // The step by its name alone: its own line is left behind, since it promised what the day's page does not hold.
  const named = { key: step.key, href: step.href, titleKey: step.titleKey };
  if (step.key === "readings" && on.readings > 0) {
    // "Read them in one go" is said of more than one.
    return on.readings > 1 ? { ...named, bodyKey: READINGS_LINE, kept: "walk" } : { ...named, kept: "walk" };
  }
  if (step.key === "churchYear" && on.saint) {
    const href = `/saints/${on.saint}`;
    if (week.some((other) => other !== step && other.href === href)) return step;
    return { ...named, href, kept: "done" };
  }
  return step;
}
