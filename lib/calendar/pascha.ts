/**
 * Orthodox Pascha for the given year, as a Date at noon UTC (avoid TZ
 * boundary surprises). Verified against published values for 2020-2030.
 *
 * On its own, with no imports, so a client page that only needs Pascha (the
 * shop's feast banner, lib/shop/feasts.ts) does not pull the whole year's
 * commemorations and readings into its bundle the way importing
 * lib/calendar/orthodox.ts would. orthodox.ts re-exports it unchanged.
 */
export function orthodoxPascha(year: number): Date {
 const a = year % 4;
 const b = year % 7;
 const c = year % 19;
 const d = (19 * c + 15) % 30;
 const e = (2 * a + 4 * b - d + 34) % 7;
 const julianMonth = Math.floor((d + e + 114) / 31); // 3=March, 4=April
 const julianDay = ((d + e + 114) % 31) + 1;
 // Julian-to-Gregorian offset: +13 days for years 1900-2099, +14 from
 // 2100-02-28, +15 from 2200-02-28, etc. Hard-coded for the current
 // window since we only need to be right for "now" + a couple years.
 const julianOffset = year < 2100 ? 13 : year < 2200 ? 14 : 15;
 const julianDate = new Date(Date.UTC(year, julianMonth - 1, julianDay, 12));
 julianDate.setUTCDate(julianDate.getUTCDate() + julianOffset);
 return julianDate;
}
