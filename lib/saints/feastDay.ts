// A saint's feast day, in the reader's language.
//
// The profiles write each fixed feast as an English month and a day
// ("August 9"), and that string went to every screen as written. A phone set
// to Greek read "Εορτή August 9": the label from the catalog, the date from
// the profile. A month and a day are a date, and the device can write a date
// in its own language without anyone translating anything.
//
// Three things are returned exactly as the profile wrote them:
//  - English. The profile's own words are the English.
//  - What is not a plain month and day. The four movable feasts ("Fifth
//    Sunday of Great Lent") are words, not dates, and words wait for a
//    translator.
//  - A date in a language the device has no data for, which it would write
//    as "M08 9" (lib/i18n/deviceDates.ts).

import { writesDatesIn } from "@/lib/i18n/deviceDates";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PLAIN = new RegExp(`^(${MONTHS.join("|")}) (\\d{1,2})$`);

/**
 * "long" is the month in full, for a saint's own screen. "short" is the
 * month abbreviated as the language abbreviates it, for the card in the
 * saints' list: its last row also holds the count of works and "Read", and
 * a month in full ("Φεβρουαρίου", "septembrie", "Nobyembre") pushed the
 * feast day onto two lines on most cards of a 360 px phone.
 */
export type FeastDayStyle = "long" | "short";

export function feastDayIn(feast: string, locale: string, style: FeastDayStyle = "long"): string {
  if (locale === "en" || locale.startsWith("en-")) return feast;
  const found = PLAIN.exec(feast);
  if (!found) return feast;
  const month = MONTHS.indexOf(found[1]);
  const day = Number(found[2]);
  // 2028 is a leap year, so February 29 is a day in it.
  const date = new Date(Date.UTC(2028, month, day, 12));
  // "February 30" rolls over into March. That is not a date to restate.
  if (date.getUTCMonth() !== month || date.getUTCDate() !== day) return feast;
  if (!writesDatesIn(locale)) return feast;
  return new Intl.DateTimeFormat(locale, { month: style, day: "numeric", timeZone: "UTC" }).format(date);
}

/** Every feast day of one saint, as one line. */
export function feastDaysIn(feasts: readonly string[], locale: string, style: FeastDayStyle = "long"): string {
  return feasts.map((feast) => feastDayIn(feast, locale, style)).join(" · ");
}
