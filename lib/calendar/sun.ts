// Sunset and sunrise, for Candlelight at Vespers (1.9, s2-02 of
// docs/1.9-build/ideas.json): "on by itself at sunset, when the Church's day
// begins, and off in the morning".
//
// The sunrise equation of the Almanac for Computers (United States Naval
// Observatory, 1990), with the sun's upper edge and the air's bending taken
// as the almanacs take them (a zenith of 90° 50'). Within a minute or two of
// the published tables, far closer than a time zone's city is to its
// readers. Pure: no window, no clock but the one it is given.

const RAD = Math.PI / 180;
const ZENITH = 90.833;
const HOUR = 3_600_000;

const sin = (d: number) => Math.sin(d * RAD);
const cos = (d: number) => Math.cos(d * RAD);
const tan = (d: number) => Math.tan(d * RAD);
const mod = (n: number, m: number) => ((n % m) + m) % m;

function dayOfYear(y: number, m: number, d: number): number {
  return Math.round((Date.UTC(y, m, d) - Date.UTC(y, 0, 0)) / 86_400_000);
}

/**
 * When the sun rises or sets on a calendar day at a place, as a moment
 * (milliseconds since 1970); null where it does not that day (the midnight
 * sun, the polar night). `y`, `m` (0 to 11) and `d` name the day as it is
 * lived at the place.
 */
export function sunEvent(y: number, m: number, d: number, lat: number, lng: number, rising: boolean): number | null {
  const n = dayOfYear(y, m, d);
  const lngHour = lng / 15;
  const t = n + ((rising ? 6 : 18) - lngHour) / 24;
  const M = 0.9856 * t - 3.289;
  const L = mod(M + 1.916 * sin(M) + 0.02 * sin(2 * M) + 282.634, 360);
  let RA = mod(Math.atan(0.91764 * tan(L)) / RAD, 360);
  RA = (RA + (Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90)) / 15;
  const sinDec = 0.39782 * sin(L);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (cos(ZENITH) - sinDec * sin(lat)) / (cosDec * cos(lat));
  if (cosH > 1 || cosH < -1) return null;
  const H = (rising ? 360 - Math.acos(cosH) / RAD : Math.acos(cosH) / RAD) / 15;
  const T = H + RA - 0.06571 * t - 6.622;
  const ut = mod(T - lngHour, 24);
  // The equation answers an hour of the day in Greenwich; the moment is the
  // one within half a day of the place's own noon, before it for a sunrise
  // and after it for a sunset.
  const noon = Date.UTC(y, m, d, 12) - lngHour * HOUR;
  let at = Date.UTC(y, m, d) + ut * HOUR;
  while (at < noon - 12 * HOUR) at += 24 * HOUR;
  while (at > noon + 12 * HOUR) at -= 24 * HOUR;
  return at;
}

/** The night around `now`, or the next one: from a sunset to the sunrise after it. */
export type Night = { start: number; end: number; now: boolean };

/**
 * The night `now` is in, or, by day, the night to come: Vespers to the
 * morning. `local` is the day as the reader lives it (the phone's date).
 * Where the sun does not rise or set that day, the evening is taken from six
 * and the morning to six, by the phone's clock.
 */
export function nightAround(now: number, local: { y: number; m: number; d: number }, lat: number, lng: number, offsetMinutes: number): Night {
  const { y, m, d } = local;
  const at = (dd: number, rising: boolean, fallbackHour: number) =>
    sunEvent(y, m, dd, lat, lng, rising) ?? Date.UTC(y, m, dd, fallbackHour) + offsetMinutes * 60_000;
  const riseToday = at(d, true, 6);
  const setToday = at(d, false, 18);
  if (now < riseToday) return { start: at(d - 1, false, 18), end: riseToday, now: true };
  const riseTomorrow = at(d + 1, true, 6);
  return { start: setToday, end: riseTomorrow, now: now >= setToday };
}
