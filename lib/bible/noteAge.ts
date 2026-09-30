/**
 * "3 months ago", "yesterday", "last year": how long since a note was written,
 * in the reader's own language (Intl.RelativeTimeFormat), for the line under a
 * saved note ("You wrote this 3 months ago"). The owner's reading spec asked
 * for exactly this reminder. Pure; `now` is passed in by the tests.
 */
export function wroteWhen(iso: string, locale: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const days = Math.round((now.getTime() - then) / 86_400_000);
  let rtf: Intl.RelativeTimeFormat;
  try {
    rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  } catch {
    rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  }
  if (days < 1) return rtf.format(0, "day");
  if (days < 30) return rtf.format(-days, "day");
  if (days < 365) return rtf.format(-Math.max(1, Math.round(days / 30.44)), "month");
  return rtf.format(-Math.max(1, Math.round(days / 365.25)), "year");
}
