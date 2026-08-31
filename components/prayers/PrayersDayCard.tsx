"use client";

import Link from "next/link";

import { FAST_DOT } from "@/lib/calendar/fastDot";
import { useChurchDay } from "@/lib/calendar/useChurchDay";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * "The day, as a card" beside the prayer of the heart on the desktop
 * Prayers hero.
 *
 * Client-side because the page is a server component whose desktop tree
 * ships into the Android export behind `hidden md:block`. A tablet at md
 * and above was therefore shown the build day's date, saint and fast for
 * the life of the APK, next to a Today tab that knew better.
 *
 * Reads useChurchDay(), so it also honours the Old Calendar, which the
 * server version did not.
 */
export function PrayersDayCard() {
  const { t, tn, locale } = useTranslate();
  const day = useChurchDay();

  return (
    <Link
      href="/prayers/today"
      className="group flex flex-col justify-between rounded-xl border border-paper/12 bg-paper/[0.03] px-7 py-8 transition-colors hover:border-paper/30"
    >
      <div>
        <p className="mb-5 font-sans text-eyebrow uppercase tracking-[2.5px] text-gold/70">
          {t("prayers.tabs.today")}
        </p>
        {day ? (
          <>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-display-sm text-paper leading-none tabular-nums">
                {day.today.getUTCDate()}
              </span>
              <span className="font-serif text-title-sm text-paper/70">
                {new Intl.DateTimeFormat(locale, {
                  month: "long",
                  timeZone: "UTC",
                }).format(day.today)}
              </span>
            </div>
            <p className="mt-5 font-serif text-ui text-paper leading-snug">
              {day.headline?.name ?? t("prayers.dayCard.fallback")}
            </p>
            <p className="mt-2.5 flex items-center gap-2 font-sans text-caption text-paper/45">
              <span
                aria-hidden
                className={`inline-block h-1.5 w-1.5 rounded-full ${FAST_DOT[day.fast.kind]}`}
              />
              <span>
                {t(`calendar.fast.${day.fast.ruleId}.label`)}
                <span className="text-paper/25"> · </span>
                {day.pascha.daysAway > 0
                  ? tn("calendar.daysUntilPascha", day.pascha.daysAway)
                  : day.pascha.daysAway === 0
                    ? t("prayers.paschaToday")
                    : t("today.paschaPassed")}
              </span>
            </p>
          </>
        ) : (
          <>
            <Skeleton className="h-12 w-32" />
            <Skeleton className="mt-5 h-4 w-48" />
            <Skeleton className="mt-3 h-3 w-40" weight="faint" />
          </>
        )}
      </div>
      <span className="mt-8 inline-flex items-center gap-1.5 font-sans text-detail font-medium text-gold/80 transition-colors group-hover:text-paper">
        {t("prayers.openToday")}
        <span
          aria-hidden
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
    </Link>
  );
}
