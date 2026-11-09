/**
 * This day in Church history (1.9, U9, s6-05 of docs/1.9-build/ideas.json;
 * his yes of 2026-11-09 to "one card under the day's saints, with the
 * event's picture, on the days an event falls on exactly").
 *
 * An event carries a day of the year only when its date is exact
 * (lib/history/events.ts, `calendar`; the integrity suite holds that), and
 * says how that day is reckoned:
 *
 *   gregorian     a civil date, kept on the civil day (Pascha's date aside,
 *                 the world's own calendar: April 10, 1970 is April 10);
 *   julian,       a day the Church keeps, kept on the reader's Church day.
 *   conventional  The New Calendar keeps May 29 on the civil May 29; the Old
 *                 Calendar keeps it thirteen days later, on the civil June 11.
 *
 * Until 1.9 every event was matched on the civil day, so an Old Calendar
 * reader was told the fall of Constantinople was "commemorated today" thirteen
 * days before their Church kept it.
 */

import { shiftForStyle, type CalStyle } from "@/lib/calendar/orthodox";

import { publishedEvents, type HistoryEventMeta } from "./events";

function monthDay(d: Date): { month: number; day: number } {
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/**
 * The events that fall on this day for a reader on this calendar: `civil` is
 * the reader's own day in the UTC-noon frame the calendar's lookups use
 * (lib/calendar/useToday.ts), as useChurchDay hands it over.
 */
export function historyEventsOnDay(civil: Date, style: CalStyle): HistoryEventMeta[] {
  const plain = monthDay(civil);
  const church = monthDay(shiftForStyle(civil, style));
  return publishedEvents().filter((e) => {
    if (!e.calendar) return false;
    const on = e.calendar.basis === "gregorian" ? plain : church;
    return e.calendar.month === on.month && e.calendar.day === on.day;
  });
}

/**
 * The one Today shows under the day's saints: the first that has its picture,
 * since the card is the event with its artwork. An event with no picture is
 * still on the Prayers page's day and in History.
 */
export function todaysHistoryEvent(civil: Date, style: CalStyle): HistoryEventMeta | null {
  return historyEventsOnDay(civil, style).find((e) => e.media) ?? null;
}
