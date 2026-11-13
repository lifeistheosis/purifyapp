"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ArrivingImage } from "@/components/ui/ArrivingImage";
import { Book } from "@/components/ui/icons/Book";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { shiftForStyle } from "@/lib/calendar/orthodox";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { useChurchDay } from "@/lib/calendar/useChurchDay";
import { dateLocale } from "@/lib/i18n/deviceDates";
import { useReaderType } from "@/lib/onboarding/useReaderType";
import { useSpace } from "@/lib/onboarding/useSpace";
import { todayRuleCard } from "@/lib/prayers/myRule";
import { EVENING_FROM_HOUR, ruleIdForHour } from "@/lib/prayers/ruleForHour";
import { useMyRule } from "@/lib/prayers/useMyRule";
import {
  dayLead,
  dayMarks,
  greetingKind,
  hourPrayer,
  learningLineKey,
  paschaCount,
  type DayPart,
  type HourVerses,
} from "@/lib/today/greeting";
import { useMounted } from "@/lib/useMounted";
import { PictureCreditNote } from "@/components/saints/PictureCredit";
import { Prayed, useKeptToday } from "./PrayNowCard";

/**
 * The top of Today under the bar, one design for each type of reader (1.8,
 * the owner's round 14, TRANSITIONARY; lib/today/greeting.ts says which and
 * why). The type is useReaderType's, the reader's own answer.
 *
 *   orthodox  the date and the day's marks, the feast's or the saint's name
 *             with their icon, Hymns of the feast, the hour's prayers.
 *   learning  Good morning, a line naming the day's feast or saint, See the day.
 *   new       Good morning and a psalm verse for the hour.
 *
 * Everything is resolved on the device: the hour from the reader's clock, the
 * day from useChurchDay (lib/calendar/useToday.ts says why a server render
 * would freeze the build day into the apps). Only the psalm verses come from
 * the server, as words that never change (components/today/TodayGreeting.tsx).
 * The dateline is blank for the frame before the day is known rather than
 * wrong, and is reserved with a non-breaking space so nothing shifts.
 *
 * Every reader's dateline ends with Pascha's count (1.8, round 3 r3-21, the
 * owner's pick A): "Friday, November 13 · Friday fast · 170 days until
 * Pascha". It was a row of The Church today, a seventh thing to read on a
 * saint's day (lib/today/greeting.ts, paschaCount).
 */
export function GreetingHeader({ verses, star }: { verses: HourVerses | null; star?: ReactNode }) {
  const { locale, t, tn } = useTranslate();
  const mounted = useMounted();
  const day = useChurchDay();
  const [style] = useCalendarStyleDefault();
  const type = useReaderType();
  const { fasting } = useSpace();
  const mine = useMyRule();

  // Local hour exists only on the client; until mounted, fall back to the
  // neutral morning option so server and hydration renders agree.
  const h = mounted ? new Date().getHours() : 8;
  // Evening starts at the hour the Pray now card below turns to the Evening
  // Rule. This said "Good afternoon" until six, an hour into that card's
  // evening.
  const part: DayPart = h < 12 ? "morning" : h < EVENING_FROM_HOUR ? "afternoon" : "evening";
  const greet =
    part === "morning"
      ? t("today.greetingMorning")
      : part === "afternoon"
        ? t("today.greetingAfternoon")
        : t("today.greetingEvening");

  const date = day
    ? new Intl.DateTimeFormat(dateLocale(locale), {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }).format(day.today)
    : " ";
  const toPascha = day ? paschaCount(day.pascha.daysAway) : null;
  const pascha = toPascha ? ("count" in toPascha ? tn(toPascha.key, toPascha.count) : t(toPascha.key)) : null;

  const lead = day ? dayLead(day, shiftForStyle(day.today, style)) : null;
  const verse = verses?.[part] ?? null;
  const kind = greetingKind(type, lead, verse !== null);
  // The one frame before the day is known: an Orthodox reader is held on a
  // blank of the headline's shape, not shown a "Good morning" that turns into
  // a feast, and a learning reader's line is held blank.
  const waiting = day === null && type !== "new";

  // The day leads once, on the night (1.9, the fifteen screens): the date, the
  // saint or the greeting, and the hour's prayer with the screen's one Begin.
  const ruleId = ruleIdForHour(h);
  const card = todayRuleCard(mine, ruleId);
  const prayer = hourPrayer(ruleId, card);
  // Said today already: the quiet mark beside "Now", as the hour's card had it
  // (his done sign of 2026-10-07). The device's own marks, so none before the
  // hour is known.
  const kept = useKeptToday();
  const prayed = mounted && kept(card ? card.id : ruleId);
  const marks = kind === "lead" && lead && day ? dayMarks(lead, day.fast, fasting) : null;
  // The small line is the date (and a feast's rank); the fast and the count
  // to Pascha stand under the saint's name, so no word is left alone on a line.
  const line = [date, marks?.feast === "great" ? t("today.greet.greatFeast") : marks?.feast === "feast" ? t("calendar.feastAria") : null, marks ? null : pascha]
    .filter(Boolean)
    .join(" · ");
  const under = marks
    ? [marks.fast ? (marks.fast.kind === "plain" ? t("today.fastPlain.label") : t(`calendar.fast.${marks.fast.ruleId}.label`)) : null, pascha].filter(Boolean).join(" · ")
    : "";
  const now = prayer.minutes ? `${t("prayers.timeline.now")} · ${t("today.minRead", { count: prayer.minutes })}` : t("prayers.timeline.now");

  return (
    <header data-day-lead="" className="day-lead dark-island relative mb-5 overflow-hidden rounded-[22px] border border-paper/12">
      {/* During the Nativity Fast its star rises here, in the lead's own sky: one night on the screen. */}
      {star}
      <div className="relative px-[18px] pb-[18px] pt-4">
        <p className="font-sans text-caption font-semibold leading-[18px] text-paper/65">{waiting ? " " : line}</p>

        {kind === "lead" && lead ? (
          <div className="mt-3 flex items-center gap-3.5">
            {lead.iconUrl ? (
              <span aria-hidden className="relative h-[78px] w-[62px] shrink-0 overflow-hidden rounded-[12px] bg-paper/[0.05] ring-1 ring-paper/14">
                <ArrivingImage src={lead.iconUrl} decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_18%]" />
              </span>
            ) : null}
            <PictureCreditNote src={lead.iconUrl} />
            {/* h2, not h1: the bar above names the screen ("Today") and owns
                its one h1 (1.7). The calendar's names are English. */}
            <div className="min-w-0">
              <h2 lang="en" dir="ltr" className="title-in font-serif text-title-sm font-bold leading-[1.22] text-paper">
                {lead.name}
              </h2>
              {under ? <p className="mt-1 text-balance font-sans text-detail leading-[19px] text-paper/75">{under}</p> : null}
            </div>
          </div>
        ) : (
          <>
            <h2 className="title-in mt-2 font-serif text-heading leading-[1.1] text-paper">{waiting ? " " : greet}</h2>
            {kind === "line" && lead ? (
              <p className="mt-1.5 font-sans text-ui leading-normal text-paper/75">{t(learningLineKey(lead), { name: lead.name })}</p>
            ) : kind === "verse" && verse ? (
              <>
                {/* The app's Psalter is English (Brenton), as the verse of the day is. */}
                <p lang="en" dir="ltr" className="mt-1.5 font-serif text-[15px] italic leading-[1.5] text-paper/75">
                  &ldquo;{verse.text}&rdquo;
                </p>
                <p className="mt-1 font-sans text-caption font-semibold text-paper/65">{t("today.greet.psalm", { ref: verse.ref })}</p>
              </>
            ) : waiting ? null : (
              <p className="mt-1 font-sans text-detail text-paper/65">{t("today.abide")}</p>
            )}
          </>
        )}

        {/* The hour's prayer: the screen's first action, and its only white button. */}
        <div className="mt-4 border-t border-paper/12 pt-3.5">
          {/* The hour is the device's: until it is known the words keep their
              place unseen, so an evening reader never sees "Morning" flash by. */}
          <div className={mounted ? undefined : "invisible"}>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-caption font-semibold leading-[18px] text-paper/65">
              <span>{now}</span>
              {prayed ? <Prayed /> : null}
            </p>
            <p className="mt-0.5 font-serif text-[21px] font-bold leading-[27px] text-paper">{t(prayer.titleKey)}</p>
          </div>
          <Link
            href={prayer.href}
            data-pray-hour=""
            className="tap-press mt-3.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-paper px-6 font-sans text-[15px] font-semibold text-night"
          >
            {t("today.prayNow.begin")}
            <ArrowRight />
          </Link>
          {kind === "lead" && lead?.hymnsHref ? (
            <Link href={lead.hymnsHref} className="tap-press mt-1 flex min-h-11 w-full items-center justify-center gap-2 font-sans text-ui font-semibold text-paper">
              <Book size={15} />
              {t("today.greet.hymns")}
            </Link>
          ) : kind === "line" && lead ? (
            <Link href="/calendar" className="tap-press mt-1 flex min-h-11 w-full items-center justify-center gap-1.5 font-sans text-ui font-semibold text-paper">
              {t("today.greet.seeDay")}
              <ChevronRight size={15} className="rtl:-scale-x-100" />
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function ArrowRight() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rtl:-scale-x-100">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
