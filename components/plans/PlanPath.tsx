"use client";

// A plan's days as a path (1.7, the owner's note 22: "the days as a path you
// can see, done ones filled, today lit, the next few waiting").
//
// The window that matters: the last two days read, today, and the next four
// a step back. From 1.9 (build 97 note 7, the fifteen screens' round 3) each
// day says what it holds: its passage is the day's words, in the serif, and
// its number the small part over them ("Day 4"), where it was a numbered
// circle beside a line. The words open the chapter. Before them is the day's
// mark, 44px to the touch: the check once the day is read, a lit ring on
// today, a faint ring on a day to come; a tap on it marks the day read or
// not, as the list always allowed. Today stands on a plate of its own with
// its word. "Every day of the plan" opens the rest, grouped by book. No line
// between the marks and nothing drawn: the rows are the path.
//
// The count of days read and its bar stand under the plan's name, from the
// first day read (components/plans/PlanClient.tsx, PlanState).
//
// Motion, with the motion switch on: the window's rows rise as they scroll
// into view, the scroll driving them (.path-rise, globals.css), and the day
// just read fills its mark when the finish lands (.path-fill). The long
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
  /** The day finished a moment ago, whose mark fills as it lands. */
  justRead: number | null;
  bookName: (slug: string) => string;
  /** `pressed` is the mark the finger is on, so the page can keep it where it is (lib/ui/useHeldPlace.ts). */
  onToggle: (index: number, read: boolean, pressed: Element) => void;
}) {
  const { t } = useTranslate();
  const [all, setAll] = useState(false);
  const listId = useId();
  const done = (i: number) => Boolean(progress?.done[String(i)]);

  // The window: two read before today, today, four after (or the last days).
  const anchor = today ?? plan.days.length - 1;
  // A day that has been in the window stays in it while the page is open.
  // Marking a third day read moved today on and dropped the first day off
  // the window's head, and every row under it, the one the finger was on
  // among them, went up a row (fresh eyes L3's kind). The window opens
  // afresh the next time the page does.
  const [first, setFirst] = useState<number | null>(null);
  const start = Math.max(0, anchor - BEHIND);
  const from = first === null ? start : Math.min(first, start);
  // Kept for the next drawing, the way React asks for what one drawing owes the last.
  if (first !== from) setFirst(from);
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
      <li
        key={i}
        data-plan-day={isToday ? "today" : isRead ? "read" : "ahead"}
        className={cn("flex items-center gap-1.5 rounded-[18px] py-1 pe-3", rise && "path-rise", isToday && "bg-night-soft ring-1 ring-inset ring-paper/10")}
      >
        <button
          type="button"
          onClick={(e) => onToggle(i, !isRead, e.currentTarget)}
          aria-pressed={isRead}
          aria-label={t(isRead ? "plans.markUnread" : "plans.markDayRead", { day: i + 1 })}
          className="tap-press grid h-11 w-11 shrink-0 place-items-center rounded-full"
        >
          <span
            aria-hidden
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full border motion-safe:transition-colors",
              isRead ? "border-paper/30 bg-paper/15 text-paper" : isToday ? "border-paper text-paper" : "border-paper/25",
              isRead && i === justRead && "path-fill",
            )}
          >
            {isRead ? <Check size={15} strokeWidth={2.2} /> : isToday ? <span className="block h-2 w-2 rounded-full bg-paper" /> : null}
          </span>
        </button>
        <Link href={hrefOfReading(plan.days[i][0])} className="flex min-h-14 min-w-0 flex-1 flex-col justify-center py-1.5">
          <span className={cn("flex items-baseline gap-2 font-sans text-caption", isToday ? "font-semibold text-paper/70" : "text-paper/55")}>
            {t("paths.day", { n: i + 1 })}
            {isToday ? <span>{t("plans.today")}</span> : null}
          </span>
          <span className={cn("mt-0.5 font-serif text-body font-semibold leading-snug [overflow-wrap:anywhere]", isToday ? "text-paper" : isRead ? "text-paper/70" : "text-paper/80")}>
            {dayLabel(plan.days[i], bookName)}
          </span>
        </Link>
      </li>
    );
  };

  return (
    <section
      aria-labelledby="plan-path"
      data-plan-path=""
      // With motion reduced the sources above fold open at once, the cut that path allows, and these days move
      // with that change; with motion on the fold pictures it (.book-fold). Named so to the gate's jump rule,
      // which honours it only with motion reduced (scripts/gate/frames.mjs).
      data-mock-allow="jump"
      data-mock-why="the sources above fold open at once with motion reduced; with motion on they fold open and the days move with them"
      className="mt-9"
    >
      <p id="plan-path" role="heading" aria-level={2} className="font-sans text-ui font-semibold text-paper">
        {t("plans.path.title")}
      </p>
      <ol className="mt-2 -ms-2 space-y-1">{near.map((i) => row(i, true))}</ol>

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
              <ol className="mt-1 -ms-2 space-y-1">{g.days.map((i) => row(i, false))}</ol>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
