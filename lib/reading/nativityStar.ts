// The Nativity Fast's card on Today (1.8): the owner's pick C of round 9,
// "The star rising", and his word "C is nice and make it animated"
// (Homebase/boards/purify-master/r18/choose/9-nativity-day.png and the motion
// in 9c-nativity-star-animated.mp4). A small night with a horizon, and a star
// that stands higher each day of the fast: low on day 1, near the top on day
// 40. On the first view of Today on the reader's local day it rises from the
// horizon to the day's height; every later view that day finds it already up.
//
// Pure, apart from the two calls that keep the day on the device. The card is
// components/today/NativityStarCard.tsx; its motion is .nat-* in globals.css.

import type { DayKey } from "@/lib/rhythm/dayKey";

/** The night's height, in px: the drawing is laid out on a 350 by 196 field. */
export const NIGHT_H = 196;
/** The horizon's crest, at the field's middle. */
export const CREST_Y = 173;
/** The star's box. */
export const STAR_PX = 22;
/** Where the star stands across the field: three quarters of the way, clear of the words. */
export const STAR_X = 250 / 350;

/** The star's top, in px from the night's top, on day `day` of `of`: higher each day. */
export function starTop(day: number, of = 40): number {
  const d = Math.min(Math.max(day, 1), of);
  return 150 - (d / of) * 110;
}

/** How far below its place the star starts its rise: from just under the horizon's crest. */
export function riseFrom(day: number, of = 40): number {
  return CREST_Y - 4 - starTop(day, of);
}

/** The device's record of the last day the star rose. */
export const RISEN_KEY = "purify:today.nativity-star";

/** The rise plays on the first view of a day only. */
export function shouldRise(lastRisen: string | null, today: DayKey): boolean {
  return lastRisen !== today;
}

/**
 * Asks once per view whether the star should rise, and keeps today as the
 * day it rose, so the next view finds it up. Storage that cannot be read
 * plays the rise; storage that cannot be written plays it again next time.
 */
export function claimRise(today: DayKey): boolean {
  let last: string | null = null;
  try {
    last = window.localStorage.getItem(RISEN_KEY);
  } catch {
    // A private window: the rise plays, and the next view decides again.
  }
  const rise = shouldRise(last, today);
  if (rise) {
    try {
      window.localStorage.setItem(RISEN_KEY, today);
    } catch {
      // Not kept: the star rises again on the next view, nothing worse.
    }
  }
  return rise;
}

export type NightStar = { x: number; y: number; r: number; o: number; dur: number; delay: number };

/**
 * The small stars of the night, as the round's drawing placed them: in the
 * field's units, each with its own brightness and its own time to twinkle.
 */
export const NIGHT_STARS: readonly NightStar[] = Array.from({ length: 22 }, (_, i) => ({
  x: ((i * 71) % 340) + 5,
  y: ((i * 37) % 120) + 8,
  r: i % 6 === 0 ? 1 : 0.6,
  o: 0.18 + (i % 4) * 0.1,
  dur: 3 + (i % 5) * 0.7,
  delay: (i * 0.37) % 3,
}));
