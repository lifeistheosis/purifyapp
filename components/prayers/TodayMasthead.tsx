"use client";

import Link from "next/link";

import { FAST_DOT } from "@/lib/calendar/fastDot";
import type { FastKind } from "@/lib/calendar/orthodox";
import type { ChurchDay } from "@/lib/calendar/useChurchDay";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

/**
 * The dateline of /prayers/today, with the day's fasting register set
 * opposite it.
 *
 * `formatLongDate()` is deliberately not used here. It hardcodes English
 * weekday and month names, which meant the page title of the app's most
 * returned-to route read "Sunday · August 2, 2026" in all 21 locales.
 * `Intl.DateTimeFormat` with the active locale is the fix, and it costs
 * nothing: no new message keys, no new translations to chase.
 *
 * `timeZone: "UTC"` is required, not optional. useToday() hands back a
 * UTC-noon frame; formatting it in the browser's zone would show the
 * previous day to anyone west of Greenwich.
 *
 * The day is a PROP, from useChurchDay() in the page body, so this file
 * never resolves "now" itself. See lib/calendar/useToday.ts for why that
 * matters to the Android export.
 */

const NBSP = "\u00A0";

const FOCUS =
  "rounded-sm focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-4";

/**
 * The short register, for the masthead. The FULL rule text lives in the
 * fast card in the second column at the same scroll position, so this is a
 * summary beside a detail, not a repetition.
 */
const FAST_SHORT_KEY: Record<FastKind, string> = {
  strict: "calendar.fast.strict",
  "wine-oil": "calendar.fast.wineOil",
  fish: "calendar.fast.fish",
  fast: "calendar.fast.plain",
  "fast-free": "calendar.fast.fastFree",
  normal: "calendar.fast.none",
};

export function TodayMasthead({ day }: { day: ChurchDay | null }) {
  const { t, locale } = useTranslate();
  const [style] = useCalendarStyleDefault();

  const weekday = day
    ? new Intl.DateTimeFormat(locale, {
        weekday: "long",
        timeZone: "UTC",
      }).format(day.today)
    : NBSP;
  const civil = day
    ? new Intl.DateTimeFormat(locale, {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(day.today)
    : NBSP;
  // Old Calendar readers see both reckonings, because the saint and the fast
  // beside them are looked up on the Julian date and the date alone would
  // not explain why.
  const julian =
    day && style === "old"
      ? new Intl.DateTimeFormat(locale, {
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        }).format(
          new Date(
            Date.UTC(
              day.today.getUTCFullYear(),
              day.today.getUTCMonth(),
              day.today.getUTCDate() - 13,
              12,
            ),
          ),
        )
      : null;

  return (
    <div className="mb-9 lg:mb-11">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="min-w-0">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[2.5px] text-paper/60">
            {t("prayers.today.eyebrow")}
          </p>

          {/* Both spans hold a non-breaking space before the day resolves, so
              the heading is never empty and the masthead never shifts. */}
          <h1 className="title-in mt-2.5 font-serif text-title leading-[1.04] tracking-[-0.015em] text-paper sm:text-heading lg:text-display-sm xl:text-display">
            <span className="block">{weekday}</span>
            <span className="block text-paper/60">{civil}</span>
          </h1>

          {julian && (
            <p className="mt-2.5 flex flex-wrap items-center gap-2 font-sans text-caption text-paper/55">
              <span>{t("calendar.reckoning.old")}</span>
              <span aria-hidden>{"·"}</span>
              <span>{julian}</span>
            </p>
          )}
        </div>

        <div className="min-w-0 shrink-0">
          {day ? (
            <Link
              href="/fasting"
              className={cn("group inline-flex items-baseline gap-2.5", FOCUS)}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-block h-[7px] w-[7px] -translate-y-[2px] rounded-full",
                  FAST_DOT[day.fast.kind],
                )}
              />
              <span className="font-serif text-lede text-paper transition-colors duration-200 group-hover:text-gold">
                {t(FAST_SHORT_KEY[day.fast.kind])}
              </span>
            </Link>
          ) : (
            <Skeleton className="h-[23px] w-[150px]" />
          )}
        </div>
      </div>

      {/* One hairline, carrying the day's liturgical tone. Colour only: the
          tone names nothing the reader has to translate. */}
      <div
        aria-hidden
        className="mt-6 h-px w-full"
        style={{
          background:
            "linear-gradient(to right, rgb(var(--tone) / 0.55), rgb(var(--tone) / 0.10) 42%, transparent)",
        }}
      />
    </div>
  );
}
