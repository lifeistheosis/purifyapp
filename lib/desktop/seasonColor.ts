// The church season's color for a day, for the Discord Plus custom frame.
// Pure; Pascha is passed in so this file does not pull the calendar's data
// into whatever imports it (lib/calendar/orthodox.ts carries the whole
// commemoration table).
//
// The usage followed is the common Russian one, with the owner's "Paschal
// gold" (approved 26 September 2026, revisable in 1.5):
//
//   crimson  Holy Week, and the Elevation of the Cross (14 September)
//   gold     Pascha to its leave-taking; Sundays and ordinary days
//   green    Palm Sunday, Pentecost and the Monday of the Holy Spirit
//   white    the Nativity through Theophany, and the Transfiguration
//   blue     the feasts of the Theotokos: her Nativity, Entry, the
//            Annunciation, the Dormition and the Protection
//   purple   Great Lent, Clean Monday to Lazarus Saturday
//
// Earlier in the list wins, so the Annunciation is blue in Lent and Holy
// Week stays crimson whatever it meets. Movable days are counted from Pascha
// on the civil date, which is the same for both calendars; fixed feasts are
// read on the church date, which on the Old Calendar is thirteen days behind.

import type { SeasonColor } from "@/lib/desktop/presenceModes";

export type SeasonReason =
  | "holyWeek"
  | "pascha"
  | "palm"
  | "pentecost"
  | "nativity"
  | "transfiguration"
  | "theotokos"
  | "cross"
  | "lent"
  | "ordinary";

const DAY = 86_400_000;

function dayNum(d: Date): number {
  return Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY);
}

const THEOTOKOS: ReadonlyArray<[number, number]> = [
  [9, 8],
  [11, 21],
  [3, 25],
  [8, 15],
  [10, 1],
];

/** `day` is a calendar day at UTC noon (startOfDayLocal). */
export function liturgicalColorOn(
  day: Date,
  style: "new" | "old",
  paschaOf: (year: number) => Date,
): { color: SeasonColor; reason: SeasonReason } {
  const off = dayNum(day) - dayNum(paschaOf(day.getUTCFullYear()));
  if (off >= -6 && off <= -1) return { color: "crimson", reason: "holyWeek" };
  if (off >= 0 && off <= 38) return { color: "gold", reason: "pascha" };
  if (off === -7) return { color: "green", reason: "palm" };
  if (off === 49 || off === 50) return { color: "green", reason: "pentecost" };

  const church = new Date(day);
  if (style === "old") church.setUTCDate(church.getUTCDate() - 13);
  const m = church.getUTCMonth() + 1;
  const d = church.getUTCDate();
  if ((m === 12 && d >= 25) || (m === 1 && d <= 6)) return { color: "white", reason: "nativity" };
  if (m === 8 && d === 6) return { color: "white", reason: "transfiguration" };
  if (THEOTOKOS.some(([mm, dd]) => mm === m && dd === d)) return { color: "blue", reason: "theotokos" };
  if (m === 9 && d === 14) return { color: "crimson", reason: "cross" };

  if (off >= -48 && off <= -8) return { color: "purple", reason: "lent" };
  return { color: "gold", reason: "ordinary" };
}
