"use client";

// A plan's days as a path (1.7, the owner's note 22: "the days as a path you
// can see, done ones filled, today lit, the next few waiting").
//
// The window that matters: the last two days read, today with a ring and
// its word, and the next four a step back. Each day is a row: a 44px circle
// (a check once read, its number until then; a tap on it marks the day read
// or not, as the list always allowed) and its passage, which opens the
// chapter. "Every day of the plan" opens the rest, grouped by book. No line
// between the circles and nothing drawn: the rows are the path.
//
// Motion, with the motion switch on: the window's rows rise as they scroll
// into view, the scroll driving them (.path-rise, globals.css), and the day
// just read fills its circle when the finish lands (.path-fill). The long
// list does not move: a scroll-driven animation per row is what made the
// shop's grid stutter on Android (globals.css, the note above .eikon-drift).

import Link from "next/link";
import { useId, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { cn } from "@/lib/cn";
import { dayLabel, type ReadingPlan } from "@/lib/plans/plans";
import type { PlanProgress } from "@/lib/plans/progress";
import { hrefOfReading } from "@/lib/plans/session";

/** Days read shown before today, and days after it. */
const BEHIND = 2;
const AHEAD = 4;

export function PlanPath({
  plan,
  progress,
  today,
  justRead,
  bookName,
  onToggle,
}: {
  plan: ReadingPlan;
  progress: PlanProgress | undefined;
  /** The first day not yet read, or null when the plan is finished. */
  today: number | null;
  /** The day finished a moment ago, whose circle fills as it lands. */
  justRead: number | null;
  bookName: (slug: string) => string;
  onToggle: (index: number, read: boolean) => void;
}) {
  const { t } = useTranslate();
  const [all, setAll] = useState(false);
  const listId = useId();
  const done = (i: number) => Boolean(progress?.done[String(i)]);
  const read = Object.keys(progress?.done ?? {}).length;

  // The window: two read before today, today, four after (or the last days).
  const anchor = today ?? plan.days.length - 1;
  const from = Math.max(0, anchor - BEHIND);
  const to = Math.min(plan.days.length - 1, anchor + AHEAD);
  const near = Array.from({ length: to - from + 1 }, (_, k) => from + k);

  // The rest, grouped by book (each kathisma is its own day already).
  const groups: { book: string; days: number[] }[] = [];
  plan.days.forEach((day, i) => {
    const book = day[0].book;
    const last = groups[groups.length - 1];
    if (last && last.book === book) last.days.push(i);
    else groups.push({ book, days: [i] });
  });

  const row = (i: number, rise: boolean) => {
    const isToday = i === today;
    const isRead = done(i);
    return (
      <li key={i} className={cn("flex items-center gap-3 py-1.5", rise && "path-rise", !isRead && !isToday && "text-paper/55")}>
        <button
          type="button"
          onClick={() => onToggle(i, !isRead)}
          aria-pressed={isRead}
          aria-label={t(isRead ? "plans.markUnread" : "plans.markDayRead", { day: i + 1 })}
          className={cn(
            "tap-press grid h-11 w-11 shrink-0 place-items-center rounded-full border motion-safe:transition-colors",
            isRead ? "border-paper bg-paper text-night" : isToday ? "border-paper text-paper ring-2 ring-paper/25 ring-offset-2 ring-offset-night" : "border-paper/20 text-paper/50 hover:border-paper/45",
            isRead && i === justRead && "path-fill",
          )}
        >
          {isRead ? <Check size={18} strokeWidth={2} /> : <span className="font-sans text-caption font-semibold tabular-nums">{i + 1}</span>}
        </button>
        <Link href={hrefOfReading(plan.days[i][0])} className="flex min-h-11 min-w-0 flex-1 items-center gap-2">
          <span className={cn("min-w-0 truncate font-sans text-ui", isToday ? "font-semibold text-paper" : isRead ? "text-paper/60" : "")}>
            {dayLabel(plan.days[i], bookName)}
          </span>
          {isToday ? <span className="shrink-0 font-sans text-caption font-semibold text-paper/70">{t("plans.today")}</span> : null}
        </Link>
      </li>
    );
  };

  return (
    <section aria-labelledby="plan-path" data-plan-path="" className="mt-10">
      <div className="flex items-baseline justify-between gap-3">
        <p id="plan-path" role="heading" aria-level={2} className="font-sans text-ui font-semibold text-paper">
          {t("plans.path.title")}
        </p>
        <p className="font-sans text-caption tabular-nums text-paper/55">{t("plans.progress", { read, total: plan.days.length })}</p>
      </div>
      <div aria-hidden className="mt-3 h-1 overflow-hidden rounded-full bg-paper/10">
        <div className="h-full rounded-full bg-paper/80" style={{ width: `${Math.round((read / plan.days.length) * 100)}%` }} />
      </div>
      <ol className="mt-3">{near.map((i) => row(i, true))}</ol>

      <button
        type="button"
        onClick={() => setAll((v) => !v)}
        aria-expanded={all}
        aria-controls={listId}
        className="tap-press mt-3 inline-flex min-h-11 items-center gap-1.5 font-sans text-detail font-semibold text-paper/70 hover:text-paper"
      >
        {t("plans.allDays")}
        <ChevronDown size={14} className={cn("motion-safe:transition-transform", all && "rotate-180")} />
      </button>
      {all ? (
        <div id={listId} className="mt-2">
          {groups.map((g) => (
            <div key={`${g.book}-${g.days[0]}`} className="mt-4 first:mt-0">
              {groups.length > 1 ? <p className="font-sans text-caption font-semibold text-paper/55">{bookName(g.book)}</p> : null}
              <ol className="mt-1">{g.days.map((i) => row(i, false))}</ol>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
