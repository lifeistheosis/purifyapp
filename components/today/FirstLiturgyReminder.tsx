"use client";

// Your first Liturgy, on Today (1.7, the owner's note 27 of 2026-10-16: "a
// reminder on Today for that Sunday"). From six days before the day the
// reader chose until the day itself: when it is, their church, how much of
// their checklist is done, and the way back into their guide. On the day it
// says the one thing the guide says most: it nearly always goes well.
//
// Two looks since 1.8, by the type of reader (the owner's round 17,
// transitionary, "A and B"; lib/today/smallLook.ts): an Orthodox reader gets
// one quiet line, a reader who is learning or new to the faith a card with
// the guide's door as a white pill. The same words, days and door in both.
//
// Local and quiet: the plan is on the device (lib/start/liturgyPlan.ts), the
// day is the device's own (lib/calendar/useToday.ts), and nothing is asked of
// a server. Nothing is drawn until the page knows the day, so the static
// export never bakes a reminder in. The reader can put it away for that day.
// It imports none of the guide's words, so Today's script carries none.

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Close } from "@/components/ui/icons/Close";
import { Lampada } from "@/components/ui/icons/Lampada";
import { useToday } from "@/lib/calendar/useToday";
import { cn } from "@/lib/cn";
import { useReaderType } from "@/lib/onboarding/useReaderType";
import {
  CHECK_IDS,
  dayOf,
  formatDay,
  kindNameKey,
  reminderFor,
  updatePlan,
  useLiturgyPlan,
} from "@/lib/start/liturgyPlan";
import { smallLook, type SmallLook } from "@/lib/today/smallLook";

export function FirstLiturgyReminder({ className }: { className?: string }) {
  const { t, locale } = useTranslate();
  const plan = useLiturgyPlan();
  const todayDate = useToday();
  const type = useReaderType();
  if (!todayDate) return null;
  const due = reminderFor(plan, dayOf(todayDate));
  if (!due) return null;

  const when =
    due.daysAway === 0
      ? t("calendar.today")
      : due.daysAway === 1
        ? t("start.liturgy.today.tomorrow")
        : formatDay(due.date, locale);
  const parts = [
    plan.kind && plan.kind !== "unsure" ? t(kindNameKey(plan.kind)) : null,
    t("start.liturgy.ready.count", { n: plan.checked.length, total: CHECK_IDS.length }),
  ].filter((part): part is string => Boolean(part));

  return (
    <FirstLiturgyLook
      look={smallLook(type)}
      when={when}
      parts={parts}
      onDay={due.daysAway === 0}
      onHide={() => updatePlan((p) => ({ ...p, hiddenFor: due.date }))}
      className={className}
    />
  );
}

/**
 * The reminder as each type of reader sees it. `parts` is their church and
 * the checklist's count; `onDay`, the day itself, adds the calm line.
 */
export function FirstLiturgyLook({
  look,
  when,
  parts,
  onDay,
  onHide,
  className,
}: {
  look: SmallLook;
  when: string;
  parts: string[];
  onDay: boolean;
  onHide: () => void;
  className?: string;
}) {
  const { t } = useTranslate();
  const hide = (
    <button
      type="button"
      onClick={onHide}
      aria-label={t("start.liturgy.today.hide")}
      className="tap-press inline-flex size-11 shrink-0 items-center justify-center rounded-full text-paper/50 hover:text-paper"
    >
      <Close size={14} />
    </button>
  );

  if (look === "line") {
    // A: one quiet line, the candle lit, the guide behind the whole line.
    const heading = [t("start.liturgy.title"), when].join(" · ");
    return (
      <section
        aria-labelledby="first-liturgy-reminder"
        data-look="line"
        className={cn("today-small flex items-center gap-1 border-y border-paper/8", className)}
      >
        <Link href="/start/first-liturgy" className="tap-press flex min-w-0 flex-1 items-center gap-3 py-[13px] ps-1">
          <Lampada size={18} className="today-glyph-lit shrink-0 text-paper" />
          <span className="min-w-0 flex-1">
            <span id="first-liturgy-reminder" className="block font-sans text-ui font-semibold leading-snug text-paper">
              {heading}
            </span>
            <span className="mt-0.5 block font-sans text-caption leading-snug text-paper/55">{parts.join(" · ")}</span>
            {onDay ? <span className="mt-0.5 block font-sans text-caption leading-snug text-paper/80">{t("start.liturgy.today.calm")}</span> : null}
          </span>
          <ChevronRight size={16} className="shrink-0 text-paper/40 rtl:-scale-x-100" />
        </Link>
        <span className="-me-2">{hide}</span>
      </section>
    );
  }

  // B: a card, the day large, and the guide's door as a white pill.
  return (
    <section
      aria-labelledby="first-liturgy-reminder"
      data-look="card"
      className={cn("today-small rounded-[22px] border border-paper/11 bg-paper/[0.035] px-[18px] py-4", className)}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2.5">
            <Lampada size={22} className="today-glyph-lit shrink-0 text-paper" />
            <span id="first-liturgy-reminder" className="font-sans text-caption font-semibold text-paper/60">
              {t("start.liturgy.title")}
            </span>
          </p>
          <p className="mt-2 font-heading text-title-sm font-bold leading-tight text-paper">{when}</p>
          <p className="mt-1 font-sans text-detail text-paper/60">{parts.join(" · ")}</p>
          {onDay ? <p className="mt-1 font-sans text-detail text-paper/80">{t("start.liturgy.today.calm")}</p> : null}
        </div>
        <span className="-me-2 -mt-2">{hide}</span>
      </div>
      <Link
        href="/start/first-liturgy"
        className="tap-press mt-3 inline-flex min-h-11 items-center rounded-pill bg-paper px-[18px] font-sans text-ui font-semibold text-night"
      >
        {t("start.liturgy.today.open")}
      </Link>
    </section>
  );
}
