// "3 hours ago" in the reader's own language, from Intl.RelativeTimeFormat,
// for sentences that put a time inside words ("asked 3 hours ago"), where the
// feed's short English stamps ("3h", lib/community/types.ts timeAgo) would
// read wrongly in every other language. Pure: the clock is a parameter.

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function relativeTime(iso: string, locale: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const seconds = Math.round((then - now) / 1000);
  let fmt: Intl.RelativeTimeFormat;
  try {
    fmt = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  } catch {
    fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  }
  for (const [unit, size] of STEPS) {
    if (Math.abs(seconds) >= size) return fmt.format(Math.round(seconds / size), unit);
  }
  return fmt.format(0, "second");
}
