import { PrayersTodayClient } from "@/components/prayers/PrayersTodayClient";
import { VerseOfDayCard } from "@/components/today/VerseOfDayCard";

export const metadata = {
  title: "Today's prayer",
  description:
    "Daily prayer: today's date, saint, fast, the appointed readings, the verse of the day, and one-tap links into the morning rule, evening rule, and Jesus Prayer.",
};

/**
 * Server shell. The body is a client component because everything on this
 * page is derived from the current day, and the Android build is a static
 * export: a server component would answer "what day is it" once, at build
 * time, and the page would show that day until the next release.
 *
 * The one thing that CANNOT move to the client is the verse of the day.
 * lib/today/verseOfDay.ts is `server-only` and reads data/bible off disk,
 * so the card is rendered here and handed down as a ReactNode. It resolves
 * the reader's own day on the client out of a date-keyed window; see
 * components/today/VerseOfDayCard.tsx.
 *
 * `revalidate` is back, as a floor under that card, and it is worth being
 * exact about what it does and does not do:
 *
 *   - on the web today it is INERT. The root layout awaits getServerLocale()
 *     (cookies) and headers(), so every page under it is server-rendered on
 *     demand and the verse window is rebuilt on every request. The build
 *     output marks this route `ƒ`, not `○`.
 *   - it is also inert under `output: "export"`, where WINDOW_DAYS widens to
 *     400 days instead.
 *   - it matters only if this route ever becomes statically prerendered,
 *     which would otherwise freeze a THREE day verse window at deploy time
 *     and serve a wrong verse from day four. That is cheap insurance against
 *     a change made in a different file.
 *
 * It does not reintroduce the frozen-day bug either way: the DAY is still
 * resolved on the device, by useToday() inside VerseOfDayView and by
 * useChurchDay() in the page body.
 */
export const revalidate = 3600;

export default function PrayersTodayPage() {
  return (
    <PrayersTodayClient verse={<VerseOfDayCard headingId="today-verse" />} />
  );
}
