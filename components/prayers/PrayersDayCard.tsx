"use client";

import Link from "next/link";

import { FAST_DOT } from "@/lib/calendar/fastDot";
import { useChurchDay } from "@/lib/calendar/useChurchDay";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD, CARD_BG, CTA, Eyebrow } from "@/components/ui/Graphite";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The day, as a card, beside the Prayers hero: the date, the day's feast or
 * saint, the fast and the count to Pascha, and the way into Today.
 *
 * Client-side because the page is a server component whose desktop tree
 * ships into the Android export behind `hidden md:block`. A tablet at md
 * and above was therefore shown the build day's date, saint and fast for
 * the life of the APK, next to a Today tab that knew better.
 *
 * Reads useChurchDay(), so it also honours the Old Calendar, which the
 * server version did not. Drawn as the front page's graphite card since the
 * hub's redesign of 2026-09-26.
 */
export function PrayersDayCard() {
  const { t, tn, locale } = useTranslate();
  const day = useChurchDay();

  return (
    <Link href="/prayers/today" className={CARD} style={CARD_BG}>
      <Eyebrow>{t("prayers.tabs.today")}</Eyebrow>
      {day ? (
        <>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-heading text-display-sm font-bold leading-none tabular-nums text-paper">
              {day.today.getUTCDate()}
            </span>
            <span className="font-heading text-title-sm font-semibold text-paper/75">
              {new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(day.today)}
            </span>
          </div>
          <p className="mt-4 font-sans text-ui leading-snug text-paper">
            {day.headline?.name ?? t("prayers.dayCard.fallback")}
          </p>
          <p className="mt-2 flex items-center gap-2 font-sans text-caption text-paper/55">
            <span aria-hidden className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${FAST_DOT[day.fast.kind]}`} />
            <span>
              {t(`calendar.fast.${day.fast.ruleId}.label`)}
              <span className="text-paper/30"> · </span>
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
          <Skeleton className="mt-4 h-12 w-32" />
          <Skeleton className="mt-4 h-4 w-48" />
          <Skeleton className="mt-3 h-3 w-40" weight="faint" />
        </>
      )}
      <p className={cn(CTA, "mt-auto pt-6")}>
        {t("prayers.openToday")} <span aria-hidden>→</span>
      </p>
    </Link>
  );
}
