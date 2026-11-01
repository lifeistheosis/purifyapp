// Which of the Hours the clock is in, without the Hours themselves.
//
// The hour of the day each Hour begins, and the answer to "which Hour is it
// now", in a module that carries none of the five services. lib/prayers/
// hours.ts imports their texts, and the Prayers tab lights the Hour the clock
// is in (its Practices tile and the daily rule's row, note 72, the owner's
// pick of r3-26) without carrying the services to know which one it is.
// hours.ts reads its hours from here, so there is one list.

export const HOUR_STARTS = [
  { slug: "first-hour", approxHour: 6 },
  { slug: "third-hour", approxHour: 9 },
  { slug: "sixth-hour", approxHour: 12 },
  { slug: "ninth-hour", approxHour: 15 },
  { slug: "compline", approxHour: 21 },
] as const;

export type HourSlug = (typeof HOUR_STARTS)[number]["slug"];

/**
 * Which Hour is "now" by the user's local clock? Returns the closest
 * canonical hour ≤ the current hour, or "first-hour" before sunrise.
 */
export function currentHourSlug(localHour: number): HourSlug {
  let chosen: HourSlug = HOUR_STARTS[0].slug;
  for (const h of HOUR_STARTS) {
    if (localHour >= h.approxHour) chosen = h.slug;
  }
  return chosen;
}
