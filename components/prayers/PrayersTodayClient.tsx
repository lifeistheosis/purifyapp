"use client";

import Link from "next/link";
import { formatLongDate } from "@/lib/calendar/orthodox";
import { FAST_DOT } from "@/lib/calendar/fastDot";
import { useChurchDay } from "@/lib/calendar/useChurchDay";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { TodayDiptychs } from "@/components/prayers/TodayDiptychs";
import { TodayGreeting } from "@/components/prayers/TodayGreeting";
import { TodayPersonalRail } from "@/components/prayers/TodayPersonalRail";
import { OnThisDayHistory } from "@/components/history/OnThisDayHistory";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  PrayerMasthead,
  PrayerSectionLabel,
  PrayerIndex,
  PrayerIndexRow,
  PrayerNote,
} from "@/components/prayers/PrayerBook";

const QUIET_LINK =
  "font-sans text-detail text-paper/55 underline decoration-paper/20 underline-offset-4 transition-colors hover:text-paper hover:decoration-paper/50";

/**
 * The body of /prayers/today.
 *
 * Client-side because every fact on this page (the dateline in the
 * masthead, the fast, the commemoration, the appointed readings, the count
 * to Pascha, the on-this-day history) is derived from "what day is it", and
 * the Android target is a static export where a server component answers
 * that question once, at build time. The page was showing the build day.
 * See lib/calendar/useToday.ts.
 *
 * Copy comes from useTranslate() rather than the server catalog, which is
 * the pattern the rest of the mobile surfaces already use and means the
 * page follows a native locale switch without a reload.
 *
 * The day is derived by lib/calendar/useChurchDay.ts, shared with the Today
 * tab's rail. This page used to derive it itself and skipped the Old
 * (Julian) Calendar shift, so an Old Calendar reader was shown the wrong
 * saint and the wrong fasting rule here while the Today tab, one tap away,
 * showed the right ones.
 */
export function PrayersTodayClient() {
  const { t } = useTranslate();
  const day = useChurchDay();
  const today = day?.today ?? null;

  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-night">
      <div className="relative z-10 mx-auto w-full max-w-[680px] px-6 py-16 md:px-8 md:py-24 lg:max-w-[1160px]">
        {/* Masthead + the personal line: the page greets its reader. */}
        <div className="mx-auto w-full max-w-[680px] lg:mx-0 lg:max-w-none">
          <PrayerMasthead
            eyebrow={t("prayers.today.eyebrow")}
            title={today ? formatLongDate(today) : " "}
          />
          <div className="lg:max-w-[720px]">
            <TodayGreeting />
          </div>
        </div>

        <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
          {/* ── Main column: the day itself ─────────────────────────────── */}
          <div className="min-w-0">
            {/* Fast + commemoration, a calm two-up, no chunky chips. */}
            <div className="grid grid-cols-1 gap-x-10 gap-y-7 border-y border-paper/10 py-7 sm:grid-cols-2">
              <div>
                <p className="font-sans text-eyebrow uppercase tracking-[2px] text-paper/40 mb-2">
                  {t("prayers.today.fast")}
                </p>
                {day ? (
                  <>
                    <p className="flex items-center gap-2 font-serif text-body text-paper">
                      <span
                        aria-hidden
                        className={`inline-block h-1.5 w-1.5 rounded-full ${FAST_DOT[day.fast.kind]}`}
                      />
                      {t(`calendar.fast.${day.fast.ruleId}.label`)}
                    </p>
                    <p className="mt-1.5 font-sans text-caption text-paper/55 leading-[1.55]">
                      {t(`calendar.fast.${day.fast.ruleId}.rule`)}
                    </p>
                  </>
                ) : (
                  <>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="mt-2 h-3 w-48" weight="faint" />
                  </>
                )}
              </div>

              <div className="flex items-start gap-4">
                {day?.headlineSaint && (
                  <SaintIcon saint={day.headlineSaint} size="sm" />
                )}
                <div className="min-w-0">
                  <p className="font-sans text-eyebrow uppercase tracking-[2px] text-paper/40 mb-2">
                    {t("prayers.today.commemoratedToday")}
                  </p>
                  {day ? (
                    <>
                      <p className="font-serif text-body text-paper leading-snug">
                        {day.headline ? (
                          day.headlineSaint ? (
                            <Link
                              href={`/saints/${day.headlineSaint.slug}`}
                              className="underline decoration-paper/25 underline-offset-2 hover:decoration-paper"
                            >
                              {day.headline.name}
                            </Link>
                          ) : (
                            day.headline.name
                          )
                        ) : (
                          t("prayers.today.noSaint")
                        )}
                      </p>
                      {day.headline?.note && (
                        <p className="mt-1.5 font-serif italic text-detail text-paper/55 leading-[1.45]">
                          {day.headline.note}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="mt-2 h-3 w-28" weight="faint" />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Pray */}
            <PrayerSectionLabel>{t("prayers.today.pray")}</PrayerSectionLabel>
            <PrayerIndex>
              <PrayerIndexRow
                href="/prayers/morning"
                title={t("prayers.morningRule")}
                description={t("prayers.today.morningBlurb")}
              />
              <PrayerIndexRow
                href="/prayers/evening"
                title={t("prayers.eveningRule")}
                description={t("prayers.today.eveningBlurb")}
              />
              <PrayerIndexRow
                href="/prayers/rope"
                title={t("prayers.rope")}
                description={t("prayers.today.ropeBlurb")}
              />
            </PrayerIndex>

            {/* Readings */}
            {day && day.readings.length > 0 && (
              <>
                <PrayerSectionLabel>
                  {t("prayers.today.readings")}
                </PrayerSectionLabel>
                <PrayerIndex>
                  {day.readings.map((r, i) => {
                    const kindLabel =
                      r.kind === "epistle"
                        ? t("bible.kindEpistle")
                        : r.kind === "ot"
                          ? t("bible.kindOt")
                          : t("bible.kindGospel");
                    return (
                      <PrayerIndexRow
                        key={i}
                        href={`/bible/${r.book}/${r.chapter}#v${r.from}`}
                        title={r.label}
                        description={kindLabel}
                      />
                    );
                  })}
                </PrayerIndex>
              </>
            )}

            {/* The prayer of the heart */}
            <div className="my-12 rounded-lg border border-paper/10 bg-paper/[0.02] px-6 py-8 text-center">
              <p className="mb-5 font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40">
                {t("prayers.jesusPrayer")}
              </p>
              <p className="font-serif text-title-sm leading-[1.5] text-paper/90">
                {t("prayers.today.jesusPrayerText")}
              </p>
              <p className="mx-auto mt-5 max-w-[44ch] font-serif italic text-detail text-paper/55 leading-[1.7]">
                {t("prayers.today.jesusPrayerBlurb")}{" "}
                <Link
                  href="/prayers/learning/jesus-prayer"
                  className="font-sans not-italic font-medium text-gold/80 underline decoration-gold/30 underline-offset-4 transition-colors hover:text-paper hover:decoration-paper"
                >
                  {t("prayers.today.learnHow")}
                </Link>
              </p>
            </div>

            {/* On this day in Church history, quiet when no firmly dated
                event matches today. */}
            {today && <OnThisDayHistory date={today} />}
          </div>

          {/* ── Rail: the reader's own thread through the app ───────────── */}
          <aside className="mt-12 lg:mt-0">
            <div className="space-y-10 lg:sticky lg:top-[88px]">
              <TodayPersonalRail />

              {/* Diptychs: client-rendered so it reads localStorage. Quiet
                  when nothing matches today. */}
              <TodayDiptychs
                heading={t("prayers.today.diptychHeading")}
                namedayLabel={t("prayers.today.namedayNote")}
                anniversaryLabel={t("prayers.today.anniversaryNote")}
              />

              <div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <Link href="/bible/psalms/1" className={QUIET_LINK}>
                    {t("prayers.today.psalter")}
                  </Link>
                  <Link href="/saints" className={QUIET_LINK}>
                    {t("prayers.today.browseSaints")}
                  </Link>
                  <Link href="/prayers/learning" className={QUIET_LINK}>
                    {t("prayers.today.learnLink")}
                  </Link>
                </div>
                {day && (
                  <PrayerNote>
                    {day.pascha.daysAway > 0
                      ? t("prayers.today.paschaInDays").replace(
                          "{days}",
                          String(day.pascha.daysAway),
                        )
                      : day.pascha.label}
                  </PrayerNote>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
