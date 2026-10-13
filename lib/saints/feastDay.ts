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
//    Sunday of Great Lent") are words, not dates, and the device cannot
//    write words. Their translations are in the message catalogs, under the
//    keys in MOVABLE_FEAST_KEYS below, and the screen that draws a saint's
//    days hands feastDaysIn the catalog to read them from.
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

/**
 * The four feasts that move with Pascha, exactly as the profiles write them
 * (lib/saints/saints.ts), and the catalog key that holds each one's words.
 * The English here has to stay the same, letter for letter, as en.json under
 * that key: lib/i18n/__tests__/smallLabels.test.ts holds the two together,
 * and fails when a profile names a movable feast that has no key here.
 */
export const MOVABLE_FEAST_KEYS: ReadonlyMap<string, string> = new Map([
  ["Second Sunday of Great Lent", "saints.movableFeast.secondSundayOfLent"],
  ["Fifth Sunday of Great Lent", "saints.movableFeast.fifthSundayOfLent"],
  ["Antipascha (Thomas Sunday)", "saints.movableFeast.antipascha"],
  ["Third Sunday of Pascha", "saints.movableFeast.thirdSundayOfPascha"],
]);

/**
 * Every feast day of one saint, as one line.
 *
 * `t` is the catalog of the reader's language (`t` from useTranslate). With
 * it, a movable feast is said in that language. Without it, a movable feast
 * stays as the profile wrote it, which is what every caller got before the
 * four had translations.
 */
export function feastDaysIn(
  feasts: readonly string[],
  locale: string,
  style: FeastDayStyle = "long",
  t?: (key: string) => string,
): string {
  return feasts
    .map((feast) => {
      const key = MOVABLE_FEAST_KEYS.get(feast);
      return key && t ? t(key) : feastDayIn(feast, locale, style);
    })
    .join(" · ");
}
