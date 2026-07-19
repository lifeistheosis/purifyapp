"use client";

import { useMounted } from "@/lib/useMounted";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Warm, time-aware greeting at the top of the mobile Today shell — the
 * meditation-app "Good morning" pattern, adapted to Purify's reverent
 * register. The greeting is derived from the user's LOCAL hour on the
 * client (the server renders in UTC, so a time-of-day greeting must be
 * resolved after mount). Until then it falls back to the neutral first
 * option, so there is no layout shift, only a word settling in.
 *
 * `date` is the UTC day (ms) from the server; the dateline is formatted
 * here, client-side, so it follows the active locale on native too.
 */
export function GreetingHeader({ date }: { date: number }) {
  const { locale, t } = useTranslate();
  // Local hour exists only on the client; until mounted, fall back to the
  // neutral morning option so server and hydration renders agree.
  const mounted = useMounted();

  const h = mounted ? new Date().getHours() : 8;
  const greet =
    h < 12
      ? t("today.greetingMorning")
      : h < 18
        ? t("today.greetingAfternoon")
        : t("today.greetingEvening");

  const dateline = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));

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
