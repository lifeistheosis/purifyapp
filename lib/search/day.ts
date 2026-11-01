// The day in the one search (1.8, r3-31 B, the owner's pick of 2026-10-31).
//
// With nothing typed, a place shows its own day under the doors, as the
// app's calendar has it (lib/calendar/useChurchDay.ts, the reader's own
// reckoning, New or Old):
//   - the Bible, today's readings, the Epistle and the Gospel;
//   - Saints, who is commemorated today, the feasts first;
//   - Prayers, the Hour the clock is in, with its minutes;
//   - History, its On this day, where it has one;
//   - Everything, all three in brief: the readings in one row, the day's
//     leading commemoration, the Hour.
// Reading, Theology, Councils and the Shop have nothing of the day, and keep
// the reader's recent words alone.
//
// Until his pick the room under the doors stood empty for a reader who had
// searched nothing yet (his note 83 of build 86, sheet r3-31). The day comes
// with the calendar on the search's first opening, a moment after the
// screen, so each place holds the room its rows will take from the first
// frame: a row is one line high and a place shows no more than its slots,
// and nothing on the screen moves as the day arrives.
//
// Pure: the screen reads the day (components/search/SearchDay.tsx) and this
// chooses what each place shows of it. lib/search/__tests__/day.test.ts.

import type { Commemoration, ReadingRef } from "@/lib/calendar/orthodox";

import type { DoorId } from "./places";

/** A row of the day, one line of name and one of what it is, at a fixed height. */
export const DAY_ROW_PX = 58;

/** How many rows each place holds room for: the most it ever shows. */
export const DAY_SLOTS: Readonly<Partial<Record<DoorId, number>>> = {
  all: 3,
  bible: 2,
  saints: 3,
  prayers: 1,
  history: 1,
};

/** The line over each place's rows, as the app already says it. */
export const DAY_EYEBROW: Readonly<Partial<Record<DoorId, string>>> = {
  all: "prayers.today.eyebrow",
  bible: "calendar.todaysReadings",
  saints: "prayers.today.commemoratedToday",
  prayers: "prayers.timeline.now",
  history: "study.history.onThisDay",
};

/** What a reading is, in the reader's language. */
export const READING_KIND_LABEL: Readonly<Record<ReadingRef["kind"], string>> = {
  epistle: "bible.kindEpistleLong",
  gospel: "bible.kindGospelLong",
  ot: "bible.kindOtLong",
};

/** The Hour the clock is in, as the Hours' timeline lists it (lib/prayers/dayTimeline.ts). */
export type DayHour = { id: string; href: string; titleKey: string; minutes?: number };

/** A History event kept on this date (lib/history/events.ts, historyEventsOn). */
export type DayEvent = { slug: string; title: string; displayDate: string };

/** The day as the screen has read it. */
export type TheDay = {
  /** The reader's civil day, at UTC noon (lib/calendar/useToday.ts). */
  today: Date;
  /** The day's own readings, in the order of its walk (lib/readings/flow.ts, dayWalk). */
  readings: readonly ReadingRef[];
  /** Its commemorations, on the day the reader's calendar keeps. */
  commemorations: readonly Commemoration[];
  hour: DayHour | null;
  events: readonly DayEvent[];
};

export type DayRow =
  /** One reading; `at` is its place in the day's walk. */
  | { kind: "reading"; at: number; reading: ReadingRef }
  /** The day's readings in one row (Everything). */
  | { kind: "readings"; readings: readonly ReadingRef[] }
  | { kind: "saint"; saint: Commemoration; href: string }
  | { kind: "hour"; hour: DayHour }
  | { kind: "event"; event: DayEvent; href: string };

const pad = (n: number) => String(n).padStart(2, "0");

/** The day in the Church calendar, as its own grid links a day. */
export function calendarDayHref(today: Date): string {
  const month = `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}`;
  return `/calendar?m=${month}&d=${month}-${pad(today.getUTCDate())}`;
}

/** A saint with a profile opens it; one without opens the day in the calendar. */
export function saintHref(saint: Commemoration, today: Date): string {
  return saint.slug && saint.saint ? `/saints/${saint.slug}` : calendarDayHref(today);
}

/** The day's feasts, then its saints, each in the calendar's own order. */
export function feastsFirst(list: readonly Commemoration[]): Commemoration[] {
  return [...list.filter((c) => c.kind === "feast"), ...list.filter((c) => c.kind !== "feast")];
}

/** What each place shows of the day, no more than the room it holds. */
export function dayRows(door: DoorId, day: TheDay): DayRow[] {
  const rows: DayRow[] = [];
  const saintRow = (saint: Commemoration): DayRow => ({ kind: "saint", saint, href: saintHref(saint, day.today) });
  switch (door) {
    case "all": {
      if (day.readings.length) rows.push({ kind: "readings", readings: day.readings });
      // The one Today leads with: the feast, else the first commemoration.
      const lead = feastsFirst(day.commemorations)[0];
      if (lead) rows.push(saintRow(lead));
      if (day.hour) rows.push({ kind: "hour", hour: day.hour });
      break;
    }
    case "bible":
      day.readings.forEach((reading, at) => rows.push({ kind: "reading", at, reading }));
      break;
    case "saints":
      for (const saint of feastsFirst(day.commemorations)) rows.push(saintRow(saint));
      break;
    case "prayers":
      if (day.hour) rows.push({ kind: "hour", hour: day.hour });
      break;
    case "history":
      for (const event of day.events) rows.push({ kind: "event", event, href: `/history/${event.slug}` });
      break;
    default:
      break;
  }
  return rows.slice(0, DAY_SLOTS[door] ?? 0);
}
