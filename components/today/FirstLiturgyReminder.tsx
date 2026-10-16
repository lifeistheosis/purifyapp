"use client";

// Your first Liturgy, on Today (1.7, the owner's note 27 of 2026-10-16: "a
// reminder on Today for that Sunday"). From six days before the day the
// reader chose until the day itself: when it is, their church, how much of
// their checklist is done, and the way back into their guide. On the day it
// says the one thing the guide says most: it nearly always goes well.
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
import { useToday } from "@/lib/calendar/useToday";
import { cn } from "@/lib/cn";
import {
  CHECK_IDS,
  dayOf,
  formatDay,
  kindNameKey,
  reminderFor,
  updatePlan,
  useLiturgyPlan,
} from "@/lib/start/liturgyPlan";

export function FirstLiturgyReminder({ className }: { className?: string }) {
  const { t, locale } = useTranslate();
  const plan = useLiturgyPlan();
  const todayDate = useToday();
  if (!todayDate) return null;
  const due = reminderFor(plan, dayOf(todayDate));
  if (!due) return null;

  const when =
    due.daysAway === 0
      ? t("calendar.today")
      : due.daysAway === 1
        ? t("start.liturgy.today.tomorrow")
        : formatDay(due.date, locale);
  const line = [
    plan.kind && plan.kind !== "unsure" ? t(kindNameKey(plan.kind)) : null,
    t("start.liturgy.ready.count", { n: plan.checked.length, total: CHECK_IDS.length }),
  ].filter(Boolean);

  return (
    <section
      aria-labelledby="first-liturgy-reminder"
      className={cn("rounded-2xl border border-paper/10 bg-paper/[0.03] p-4", className)}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p id="first-liturgy-reminder" className="font-heading text-title-sm font-semibold leading-tight text-paper">
            {t("start.liturgy.title")}
          </p>
          <p className="mt-1 font-sans text-detail text-paper/65">
            <span className="font-semibold text-paper/85">{when}</span>
            {line.map((part) => (
              <span key={part}>
                {" · "}
                {part}
              </span>
            ))}
          </p>
          {due.daysAway === 0 ? (
            <p className="mt-2 font-sans text-detail text-paper/80">{t("start.liturgy.today.calm")}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => updatePlan((p) => ({ ...p, hiddenFor: due.date }))}
          aria-label={t("start.liturgy.today.hide")}
          className="tap-press -me-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-paper/50 hover:text-paper"
        >
          <Close size={14} />
        </button>
      </div>
      <Link
        href="/start/first-liturgy"
        className="tap-press mt-4 inline-flex min-h-11 items-center gap-1.5 rounded-pill bg-paper px-4 font-sans text-caption font-semibold text-night"
      >
        {t("start.liturgy.today.open")}
        <ChevronRight size={14} className="rtl:-scale-x-100" />
      </Link>
    </section>
  );
}
