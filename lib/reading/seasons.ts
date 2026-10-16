import { orthodoxPascha } from "@/lib/calendar/pascha";

import type { SeasonId } from "./catalog";

/**
 * The season of the Church's year a day falls in, for the reading room's
 * season row and the book at the top of the room (1.7): the season it is,
 * else the one coming next, so the row always has a name.
 *
 * The fixed feasts follow the reader's calendar (Settings, lib/calendar/
 * styleDefault.ts): on the Old Calendar, the Nativity is kept on the civil
 * 7 January, thirteen days after the New. The seasons that hang on Pascha
 * are the same in both, since both keep the Orthodox Pascha.
 *
 * `day` is a calendar day at noon UTC (lib/calendar/useToday.ts). Pure, so
 * lib/reading/__tests__/seasons.test.ts walks a year of it.
 */

export type CalendarStyle = "new" | "old";

const DAY = 24 * 60 * 60 * 1000;
const OLD_OFFSET = 13;

type Span = { id: SeasonId; start: number; end: number };

const at = (year: number, month: number, day: number) => Date.UTC(year, month - 1, day, 12);

function spans(year: number, style: CalendarStyle): Span[] {
  const p = orthodoxPascha(year).getTime();
  const shift = style === "old" ? OLD_OFFSET * DAY : 0;
  const fixed = (y: number, m: number, d: number) => at(y, m, d) + shift;
  return [
    // In order of precedence: where two overlap, the first wins.
    { id: "holyWeek", start: p - 7 * DAY, end: p - DAY },
    { id: "pascha", start: p, end: p + 38 * DAY },
    { id: "lent", start: p - 48 * DAY, end: p - 8 * DAY },
    { id: "transfiguration", start: fixed(year, 8, 6), end: fixed(year, 8, 13) },
    { id: "dormition", start: fixed(year, 8, 1), end: fixed(year, 8, 23) },
    { id: "nativity", start: fixed(year - 1, 12, 25), end: fixed(year, 1, 5) },
    { id: "nativity", start: fixed(year, 12, 25), end: fixed(year + 1, 1, 5) },
    { id: "theophany", start: fixed(year, 1, 6), end: fixed(year, 1, 14) },
    { id: "nativityFast", start: fixed(year - 1, 11, 15), end: fixed(year - 1, 12, 24) },
    { id: "nativityFast", start: fixed(year, 11, 15), end: fixed(year, 12, 24) },
  ];
}

/** The season the day is in, if any, and the next one to begin after it. */
export function readingSeason(day: Date, style: CalendarStyle): { current: SeasonId | null; next: SeasonId } {
  const t = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12);
  const year = day.getUTCFullYear();
  const all = [...spans(year, style), ...spans(year + 1, style)];
  const current = all.find((s) => t >= s.start && t <= s.end)?.id ?? null;
  const next = all.filter((s) => s.start > t).sort((a, b) => a.start - b.start)[0].id;
  return { current, next };
}
