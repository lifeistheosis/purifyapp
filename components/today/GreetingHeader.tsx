"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Book } from "@/components/ui/icons/Book";
import { Play } from "@/components/ui/icons/Play";
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
  type DayPart,
  type HourVerses,
} from "@/lib/today/greeting";
import { useMounted } from "@/lib/useMounted";

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
 */
export function GreetingHeader({ verses }: { verses: HourVerses | null }) {
  const { locale, t } = useTranslate();
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

  const lead = day ? dayLead(day, shiftForStyle(day.today, style)) : null;
  const verse = verses?.[part] ?? null;
  const kind = greetingKind(type, lead, verse !== null);
  // The one frame before the day is known: an Orthodox reader is held on a
  // blank of the headline's shape, not shown a "Good morning" that turns into
  // a feast, and a learning reader's line is held blank.
  const waiting = day === null && type !== "new";

  if (waiting && type === "orthodox") {
    return (
      <header aria-hidden className="mb-5">
        <p className="font-sans text-detail text-paper/60">{" "}</p>
        <p className="mt-2.5 font-serif text-title-sm font-bold leading-[1.22]">{" "}</p>
      </header>
    );
  }

  if (kind === "lead" && lead && day) {
    const marks = dayMarks(lead, day.fast, fasting);
    const line = [
      date,
      marks.feast === "great" ? t("today.greet.greatFeast") : marks.feast === "feast" ? t("calendar.feastAria") : null,
      marks.fast === null
        ? null
        : marks.fast.kind === "plain"
          ? t("today.fastPlain.label")
          : t(`calendar.fast.${marks.fast.ruleId}.label`),
    ]
      .filter(Boolean)
      .join(" · ");
    const ruleId = ruleIdForHour(h);
    const prayer = hourPrayer(ruleId, todayRuleCard(mine, ruleId));
    const pill = prayer.minutes
      ? `${t(prayer.titleKey)} · ${t("today.minRead", { count: prayer.minutes })}`
      : t(prayer.titleKey);
    return (
      <header className="mb-5">
        <p className="font-sans text-detail text-paper/60">{line}</p>
        <div className="mt-2.5 flex items-start gap-3.5">
          {lead.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- the app's own icon, as it is (NameDayCard draws it the same way).
            <img
              src={lead.iconUrl}
              alt=""
              decoding="async"
              className="h-[78px] w-[62px] shrink-0 rounded-[12px] object-cover object-[50%_18%] ring-1 ring-paper/14"
            />
          ) : null}
          {/* h2, not h1: the bar above names the screen ("Today") and owns
              its one h1 (1.7). The calendar's names are English. */}
          <h2 lang="en" className="title-in min-w-0 font-serif text-title-sm font-bold leading-[1.22] text-paper">
            {lead.name}
          </h2>
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          {lead.hymnsHref ? (
            <Link
              href={lead.hymnsHref}
              className="tap-press hit-44 inline-flex min-h-[38px] items-center gap-[7px] rounded-pill border border-paper/22 px-[13px] font-sans text-detail font-semibold text-paper transition-colors hover:border-paper/40"
            >
              <Book size={15} />
              {t("today.greet.hymns")}
            </Link>
          ) : null}
          <Link
            href={prayer.href}
            className="tap-press hit-44 inline-flex min-h-[38px] items-center gap-[7px] rounded-pill bg-paper px-[13px] font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90"
          >
            <Play size={13} className="rtl:-scale-x-100" />
            {pill}
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="mb-5">
      <p className="font-sans text-detail text-paper/60">{date}</p>
      {/* h2, not h1: the tab bar above names the screen ("Today") and owns
          its one h1 (1.7). The size is the classes', so nothing moves. */}
      <h2 className="title-in mt-1.5 font-serif text-heading leading-[1.1] text-paper">{greet}</h2>
      {kind === "line" && lead ? (
        <>
          <p className="mt-1.5 font-sans text-ui leading-normal text-paper/75">{t(learningLineKey(lead), { name: lead.name })}</p>
          <Link
            href="/calendar"
            className="hit-44 mt-2 inline-flex items-center gap-1 font-sans text-detail font-semibold text-paper underline-offset-4 hover:underline"
          >
            {t("today.greet.seeDay")}
            <span aria-hidden className="inline-block rtl:-scale-x-100">
              {"→"}
            </span>
          </Link>
        </>
      ) : kind === "verse" && verse ? (
        <>
          {/* The app's Psalter is English (Brenton), as the verse of the day is. */}
          <p lang="en" className="mt-1.5 font-serif text-[15px] italic leading-[1.5] text-paper/70">
            &ldquo;{verse.text}&rdquo;
          </p>
          <p className="mt-[5px] font-sans text-[11.5px] font-semibold uppercase tracking-[0.12em] text-paper/45">
            {t("today.greet.psalm", { ref: verse.ref })}
          </p>
        </>
      ) : waiting ? (
        <p aria-hidden className="mt-1.5 font-sans text-ui leading-normal">
          {" "}
        </p>
      ) : (
        <p className="mt-1 font-sans text-detail text-paper/55">{t("today.abide")}</p>
      )}
    </header>
  );
}
