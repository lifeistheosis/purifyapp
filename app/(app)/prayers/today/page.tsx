import { PrayersTodayClient } from "@/components/prayers/PrayersTodayClient";

export const metadata = {
  title: "Today's prayer",
  description:
    "Daily prayer: today's date, saint, fast, the appointed readings, the prayer rope, and one-tap links into the morning rule, evening rule, and Jesus Prayer.",
};

/**
 * Server shell only. The body is a client component because everything on
 * this page is derived from the current day, and the Android build is a
 * static export: a server component would answer "what day is it" once, at
 * build time, and the page would show that day until the next release.
 *
 * The old `export const revalidate = 3600` is gone with it. It was a no-op
 * in a static export, and on web the client resolves the day per visit
 * anyway, so there is nothing left here for ISR to refresh.
 */
export default function PrayersTodayPage() {
  return <PrayersTodayClient />;
}
