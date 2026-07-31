"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useMounted } from "@/lib/useMounted";
import { useToday } from "@/lib/calendar/useToday";

/**
 * Warm, time-aware greeting at the top of the mobile Today shell — the
 * meditation-app "Good morning" pattern, adapted to Purify's reverent
 * register. Both halves are resolved on the device: the greeting from the
 * reader's local hour, the dateline from the reader's local day.
 *
 * The dateline used to arrive as a `date` prop computed in a server
 * component, which meant the Android build baked the build day into the
 * APK and the app read the wrong date until the next release. See
 * lib/calendar/useToday.ts. The dateline is blank for the frame before
 * hydration rather than wrong, and is reserved with a non-breaking space so
 * nothing shifts when it lands.
 */
export function GreetingHeader() {
  const { locale, t } = useTranslate();
  const mounted = useMounted();
  const today = useToday();

  // Local hour exists only on the client; until mounted, fall back to the
  // neutral morning option so server and hydration renders agree.
  const h = mounted ? new Date().getHours() : 8;
  const greet =
    h < 12
      ? t("today.greetingMorning")
      : h < 18
        ? t("today.greetingAfternoon")
        : t("today.greetingEvening");

  const dateline = today
    ? new Intl.DateTimeFormat(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }).format(today)
    : " ";

  return (
    <header className="mb-5">
      <p className="font-sans text-eyebrow uppercase tracking-[2px] text-paper/45">
        {dateline}
      </p>
      <h1 className="mt-1.5 font-serif text-heading leading-[1.1] text-paper">
        {greet}
      </h1>
      <p className="mt-1 font-sans text-detail text-paper/55">
        {t("today.abide")}
      </p>
    </header>
  );
}
