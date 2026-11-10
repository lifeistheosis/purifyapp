// Candlelight keeps the season (1.9: PLAN 15, "palettes of the season";
// docs/1.9-build/ideas.json s2-03, "Palettes that follow the Church year",
// in the shape recommended there: "Candlelight's soft light takes the
// season's colour, the page unchanged").
//
// Candlelight is a candle's room: a black page, and a soft white light
// resting where the eye does (app/globals.css, .candle-veil). While this is
// on, in the Church's three long fasts that light takes the fast's colour,
// the one the calendar already gives it (lib/calendar/tone.ts, SEASON_TONES):
// violet from Clean Monday to Holy Saturday, a deep blue through the Nativity
// Fast, the Mother of God's blue through the Dormition Fast. At every other
// time, the feasts and Pascha among them, the light is the candle's own
// white. Nothing else on the page changes: not its ground, not its ink.
//
// Which day is in which season is the calendar's to say (currentSeason, in
// the reader's own reckoning), so this and the calendar's page cannot
// disagree about a day. No gold: the house keeps gold for a flame.
//
// A coloured light lies BEHIND the words, where the white one lies over them
// (the white adds to the ink as much as to the ground; a colour laid over
// light-grey words would take them down with it). Each is as full as it can
// be with every word on the page still at 4.5:1 or more on Candlelight's
// ground; lib/reader/__tests__/candleSeason.test.ts does the sums, and says
// why two of the calendar's seasons that are green are not here.

import { currentSeason, type CalStyle } from "@/lib/calendar/orthodox";

/** "0" while a reader has turned it off. On for everyone else. */
export const CANDLE_SEASON_KEY = "purify.reader.candleSeason";

/** Is the switch on? */
export function candleSeasonOn(): boolean {
  try {
    return window.localStorage.getItem(CANDLE_SEASON_KEY) !== "0";
  } catch {
    return true;
  }
}

export type CandleSeason = "lent" | "nativity" | "dormition";

/**
 * A season's light: the calendar's own tone for it, as "R G B", and the
 * share of it laid on Candlelight's ground at the light's centre.
 */
export type CandleLight = { id: CandleSeason; rgb: string; share: number };

export const CANDLE_LIGHTS: Record<CandleSeason, CandleLight> = {
  // Holy Week's violet, for all of Lent: the brief's own words, "Lent's violet".
  lent: { id: "lent", rgb: "82 36 110", share: 0.17 },
  nativity: { id: "nativity", rgb: "50 60 130", share: 0.13 },
  dormition: { id: "dormition", rgb: "60 95 155", share: 0.09 },
};

/**
 * Every season the calendar names, and the candle's light in it. Null is the
 * candle's own white. Every name is listed, so a season added to the calendar
 * has to be decided here before it ships (the test walks the years).
 */
export const SEASON_LIGHT: Record<string, CandleSeason | null> = {
  "Great Lent": "lent",
  "Holy Week": "lent",
  // A feast inside the fast: the candle's own white for the day.
  "Palm Sunday": null,
  "Bright Week": null,
  "Paschal season": null,
  "Pre-Lent": null,
  // The calendar's olive: a green cannot be seen at the strength a light may have here.
  "Apostles' Fast": null,
  "Dormition Fast": "dormition",
  "Nativity Fast": "nativity",
  "The Twelve Days": null,
};

/** The candle's light on a day, in the reader's reckoning. Null is its own white. */
export function candleLight(date: Date, style: CalStyle): CandleLight | null {
  const season = currentSeason(date, style);
  const id = season ? SEASON_LIGHT[season.label] : null;
  return id ? CANDLE_LIGHTS[id] : null;
}
