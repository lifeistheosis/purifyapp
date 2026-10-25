"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { TONE_RGB, toneFor, toneVars } from "@/lib/calendar/tone";
import { useChurchDay } from "@/lib/calendar/useChurchDay";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { StreakAtRisk } from "@/components/streak/StreakAtRisk";
import { StreakCard } from "@/components/streak/StreakCard";
import { ChurchTodayRail } from "@/components/today/ChurchTodayRail";
import { FirstLiturgyReminder } from "@/components/today/FirstLiturgyReminder";
import { NameDayCard } from "@/components/today/NameDayCard";
import { OnThisDayHistory } from "@/components/history/OnThisDayHistory";
import { DayTimeline } from "@/components/prayers/DayTimeline";
import { TodayDiptychs } from "@/components/prayers/TodayDiptychs";
import { TodayHeading } from "@/components/prayers/TodayHeading";
import { TodayHourRule } from "@/components/prayers/TodayHourRule";
import { TodayMasthead } from "@/components/prayers/TodayMasthead";
import { TodayPersonalRail } from "@/components/prayers/TodayPersonalRail";

const QUIET_LINK =
  "rounded-sm font-sans text-detail text-paper/60 underline decoration-paper/25 underline-offset-4 transition-colors duration-200 hover:text-paper hover:decoration-paper/60 focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-4";

/**
 * The body of /prayers/today.
 *
 * This is the WEB's only Today surface: app/page.tsx puts TodayMobileV3
 * behind <NativeOnly> and the marketing home behind <WebOnly>, so a desktop
 * reader who wants the day has this page and nothing else. It is laid out
 * for that job: the dateline and the day's register, then the one act the
 * hour asks for, then the day's word, then the day's prayers, with the
 * Church's own reckoning of the day in a second column beside them.
 *
 * On a phone (1.7, the owner's note 16) it is today's prayers and nothing
 * the Today tab already shows: the dateline, the act, the day's prayers as a
 * timeline with the part of the day the clock is in lit
 * (components/prayers/DayTimeline.tsx), the streak, the names of the day, and
 * the prayer of the heart. The verse, the Church's day, where the reader left
 * off and the day in history are the Today tab's, and stay on the computer.
 *
 * Client-side because every fact here (the dateline, the fast, the
 * commemoration, the readings, the count to Pascha, the on-this-day history)
 * is derived from "what day is it", and the Android target is a static
 * export where a server component answers that question once, at build time.
 * The page was showing the build day. See lib/calendar/useToday.ts.
 *
 * The day is derived by lib/calendar/useChurchDay.ts, shared with the native
 * Today tab. This page used to derive it itself and skipped the Old (Julian)
 * Calendar shift, so an Old Calendar reader was shown the wrong saint and the
 * wrong fasting rule here while the Today tab, one tap away, showed the right
 * ones.
 *
 * THE VERSE IS A PROP. lib/today/verseOfDay.ts is `server-only` and reads
 * data/bible off disk, so it cannot be imported into this client body. The
 * server shell above passes the rendered card down as a ReactNode.
 *
 * TWO THINGS ABOUT THE ROOT ELEMENT, both load-bearing:
 *
 *   - no `isolate`, and
 *   - no `.cascade` anywhere above the verse card, because `.cascade > *`
 *     carries `animation-fill-mode: both`, which makes every direct child a
 *     PERMANENT stacking context. `.rise-none` swaps the animation name, not
 *     the fill mode, so it is not an escape hatch. See the route-fade
 *     stacking note in app/globals.css.
 *
 * Both are now DEFENCE IN DEPTH rather than load-bearing. They were
 * load-bearing while VerseCardActions rendered its action sheet as
 * `fixed inset-0 z-50` inline: a stacking context here scoped that sheet to
 * the page and let the root-level tab bar paint over it. That sheet is on
 * components/ui/Sheet.tsx now and portals to <body>, so it competes at the
 * root. Keep both rules anyway. The next inline overlay somebody adds to
 * this tree will need them, and finding out the hard way costs a beta cycle.
 */
export function PrayersTodayClient({ verse }: { verse?: ReactNode }) {
  const { t } = useTranslate();
  const day = useChurchDay();

  // The day's liturgical tone, as colour only, on one hairline. Nothing on
  // this page renders the tone's NAME: currentSeason(), movableLabelOn() and
  // liturgicalGreeting() all return hardcoded English with no message keys,
  // so printing them would put untranslated English into 21 locales.
  const toneStyle: CSSProperties = day
    ? toneVars(
        toneFor({
          hasFeast: day.headline?.kind === "feast",
          fast: day.fast.kind,
        }),
      )
    : ({ "--tone": TONE_RGB.muted } as CSSProperties);

  return (
    <div className="relative min-h-screen bg-night" style={toneStyle}>
      {/* max-w and px match components/nav/AppNav.tsx and
          components/layout/Footer.tsx exactly, so the H1's left edge lands on
          the Purify wordmark's at every width. Do not change one without the
          others. */}
      <div className="relative mx-auto w-full max-w-[680px] px-5 py-10 md:px-8 md:py-12 lg:max-w-[1240px] lg:pb-24">
        <TodayMasthead day={day} />

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-x-10">
          {/* ── The reader's column: the act, the word, the choice ──────── */}
          <div className="min-w-0">
            {/* From 6 pm, a streak going and today not kept. Nothing otherwise. */}
            <StreakAtRisk className="mb-8" />
            <TodayHourRule />

            {/* The day's word. The single art object on the page, and the
                only block that changes every one of the 366 days. The
                computer's: a phone has it on the Today tab. */}
            <section aria-labelledby="today-verse" className="mt-10 hidden md:block native-md-hidden">
              {verse ?? (
                <div
                  aria-hidden
                  className="h-[300px] rounded-[28px] border border-paper/10 bg-paper/[0.03]"
                />
              )}
            </section>

            {/* Your first Liturgy (1.7): the week of the day the reader chose
                in the guide, under the day's word as on the apps' Today. */}
            <FirstLiturgyReminder className="mt-6" />

            {/* Your name day (1.8), on that day only, as on the apps' Today. */}
            <NameDayCard className="mt-6" />

            {/* The day's prayers (1.7): the daily rule and the Hours down one
                line, by part of the day, the part the clock is in lit. The
                reader keeps every route on all 366 days, including the
                Evening Rule at 8am. */}
            <section aria-labelledby="today-pray" className="mt-12">
              <TodayHeading id="today-pray">
                {t("prayers.timeline.title")}
              </TodayHeading>
              <DayTimeline variant="day" className="mt-5" />
              {/* Chants (1.7): the library, where the Anthem's row was. */}
              <Link href="/chants" className={`mt-6 inline-flex min-h-11 items-center ${QUIET_LINK}`}>
                {t("chants.title")}
              </Link>
            </section>
          </div>

          {/* ── The Church's column, and the reader's own thread ────────── */}
          <div className="mt-14 min-w-0 space-y-12 lg:mt-0">
            {/* The reader's streak, red, with the week under it. */}
            <StreakCard />

            {/* ChurchTodayRail is the SAME component the native Today tab
                renders. That is the point: one component answers "what does
                the Church say today", so the two surfaces cannot drift the
                way they did before lib/calendar/useChurchDay.ts existed. It
                brings the saint's icon and read estimate, the fast rule
                linked to /fasting, the readings as kind chips, and a
                pluralized Pascha count, all of which this page either
                lacked or hand-rolled worse. */}
            <section aria-labelledby="today-church" className="hidden md:block native-md-hidden">
              <TodayHeading id="today-church">
                {t("today.churchToday")}
              </TodayHeading>
              <div className="mt-4">
                <ChurchTodayRail />
              </div>
            </section>

            {/* Quiet when nothing matches today. */}
            <TodayDiptychs
              heading={t("prayers.today.diptychHeading")}
              namedayLabel={t("prayers.today.namedayNote")}
            />

            <div className="hidden space-y-12 md:block native-md-hidden">
              <TodayPersonalRail />

              {/* Quiet on the ~358 days a year with no firmly dated event. */}
              {day && <OnThisDayHistory date={day.today} />}
            </div>
          </div>
        </div>

        {/* The prayer of the heart closes the spread. It used to be the
            largest, and the only filled and bordered, object in the main
            column, byte-identical on all 366 days. Same words, set small and
            left on a measure. */}
        <section
          aria-labelledby="today-heart"
          className="mt-16 border-t border-paper/12 pt-12 lg:mt-20"
        >
          <TodayHeading id="today-heart">{t("prayers.jesusPrayer")}</TodayHeading>

          <p className="mt-5 max-w-[46ch] font-serif text-title-sm leading-[1.45] text-paper/90 lg:text-title">
            {t("prayers.today.jesusPrayerText")}
          </p>

          <p className="mt-5 max-w-[56ch] font-serif italic text-detail leading-[1.7] text-paper/60">
            {t("prayers.today.jesusPrayerBlurb")}
          </p>

          <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
            <Link href="/prayers/learning/jesus-prayer" className={QUIET_LINK}>
              {t("prayers.today.learnHow")}
            </Link>
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
        </section>
      </div>
    </div>
  );
}
