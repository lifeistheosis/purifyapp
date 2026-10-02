/**
 * A date of record on a profile (the day a reader joined, the month a badge
 * came) as text, always read in UTC.
 *
 * The share page (app/(app)/u/[handle]) is rendered on the server, which runs
 * in UTC, and then hydrated on the reader's own device. Formatted in the
 * device's zone, the two disagreed around midnight: @purify joined at 00:11
 * UTC on May 19, the server wrote "May 19" and a phone in the Americas wrote
 * "May 18", and React threw a hydration error (#418) on the live page. One
 * zone for both, and every reader sees the same date.
 */
export function recordDate(iso: string, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(new Date(iso));
}
