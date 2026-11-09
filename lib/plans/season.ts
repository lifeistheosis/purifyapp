import { JULIAN_OFFSET_DAYS, shiftForStyle, type CalStyle } from "@/lib/calendar/orthodox";
import { orthodoxPascha } from "@/lib/calendar/pascha";

import type { Season } from "./plans";

/**
 * The season's plan on the reading plans page (1.9, the owner's pick for
 * Practice: "Continue first, the season's plan below it").
 *
 * One season so far, the Nativity Fast, whose plan is the Church's own
 * readings of the Nativity (lib/plans/plans.ts, nativity; his pick of
 * 2026-11-07). The fast runs from 15 November to 24 December on the
 * Church's calendar, which for a reader on the Old Calendar is 28 November
 * to 6 January by the civil one. Its card stands from two weeks before the
 * fast to the feast itself: before the fast with the day it begins in the
 * reader's own calendar, during it without. Read on the menologion's day
 * (lib/calendar/orthodox.ts, shiftForStyle), as the fast itself is.
 */
export type SeasonNow = { planId: Season; begins: Date | null };

/** On the Church's calendar, as month * 100 + day. */
const SHOWN_FROM = 1101;
const FAST_FROM = 1115;
const FEAST = 1225;

const DAY_MS = 86_400_000;

/**
 * Holy Week (1.9, his yes of 2026-11-09 to the sheet's 12): its plan's card
 * stands from two weeks before Lazarus Saturday to Pascha, by Pascha's date,
 * which both calendars keep on the same civil day. Before Lazarus Saturday it
 * says the day the plan begins.
 */
function holyWeekNow(civil: Date): SeasonNow | null {
  const pascha = orthodoxPascha(civil.getUTCFullYear());
  const lazarus = new Date(pascha.getTime() - 8 * DAY_MS);
  const shown = new Date(lazarus.getTime() - 14 * DAY_MS);
  if (civil >= shown && civil < lazarus) return { planId: "holyweek", begins: lazarus };
  if (civil >= lazarus && civil <= pascha) return { planId: "holyweek", begins: null };
  return null;
}

/** The season under way or coming, on the reader's civil day, or null. */
export function seasonNow(today: Date, style: CalStyle): SeasonNow | null {
  // The civil day at noon in UTC, so the shift and the reading of the month
  // and day agree in every time zone.
  const civil = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12));
  const holyWeek = holyWeekNow(civil);
  if (holyWeek) return holyWeek;
  const church = shiftForStyle(civil, style);
  const md = (church.getUTCMonth() + 1) * 100 + church.getUTCDate();
  if (md >= SHOWN_FROM && md < FAST_FROM) {
    // 15 November on the Church's calendar, as the reader's civil day.
    const begins = new Date(Date.UTC(church.getUTCFullYear(), 10, 15, 12));
    if (style === "old") begins.setUTCDate(begins.getUTCDate() + JULIAN_OFFSET_DAYS);
    return { planId: "nativity", begins };
  }
  if (md >= FAST_FROM && md <= FEAST) return { planId: "nativity", begins: null };
  return null;
}

/** A season plan's picture: the Theotokos, whose icon the apps already carry (lib/saints/saints.ts). */
export const SEASON_PICTURE = "/saints/icons/theotokos.jpg";

/**
 * Each season's picture. Holy Week's is Christ Pantocrator of Sinai (6th
 * century, public domain, lib/prayers/icons.ts), which the apps already
 * carry for the prayers.
 */
export const SEASON_PICTURES: Record<Season, string> = {
  nativity: SEASON_PICTURE,
  holyweek: "/icons/prayer/christ-pantocrator.v2.jpg",
};
