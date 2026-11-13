"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PrayerRope } from "@/components/streak/PrayerRope";
import { StreakSheet } from "@/components/streak/StreakSheet";
import { cn } from "@/lib/cn";
import { useStreakWaits } from "@/lib/onboarding/useDayOne";
import { todayKey } from "@/lib/rhythm/dayKey";
import { ropeRow, ropeWeek } from "@/lib/streak/rope";
import { useStreak, type StreakView } from "@/lib/streak/useStreak";

/**
 * The streak on Today, as the prayer rope (1.8): the owner's pick B of round
 * 5 (Homebase/boards/purify-master/r18/choose/5b-streak-new.png). "N days"
 * and one line, then this week's seven knots, Monday first (PrayerRope). A
 * tap opens the streak's sheet, as the row always did.
 *
 * It was the red flame, the count and a sentence (1.7, the owner's pick of
 * 2026-10-15), and the flame and count rode in the top bar too; the bar is
 * lighter now (round 15 A) and the streak lives here alone, with no flame and
 * no red. The count glows white once today is kept.
 *
 * It waits while the Day 1 card shows (his pick B of round 6, "Day 1 alone")
 * and comes back once Day 1 is taken or dismissed; from 6 pm, an unkept day of
 * a going streak, the evening card stands in its place (StreakAtRisk). Both
 * rules are lib/streak/rope.ts, ropeRow.
 */
export function StreakRow({ className }: { className?: string }) {
  const view = useStreak();
  const dayOne = useStreakWaits();
  const place = ropeRow(view, dayOne);
  if (place === "none") return null;
  // No zero as a first sight (1.9, the fifteen screens): the rope is drawn
  // from the first day kept. Until then Today's lead is the invitation.
  if (view.ready && view.best === 0 && !view.keptToday) return null;
  // The rope's height, held before the streak is read, so the cards under it
  // do not jump when it lands; held only where a kept day is stored (data-kept,
  // lib/streak/streakPrepaint.ts), since with none the rope is not drawn.
  if (place === "hold") return <RopeHold className={className} />;
  return <Rope view={view} className={className} />;
}

/**
 * The same rope on the You tab (1.8, note 71): the owner's pick A of r3-25,
 * "the Ladder, then the day", where it took the place of the red flame card
 * (components/streak/StreakCard.tsx; refinement 4). Always drawn there: the
 * Day 1 card and the evening card are Today's, and You keeps the streak in
 * view whatever the hour. Its card is the You tab's to dress (`className`).
 */
export function StreakRope({ className }: { className?: string }) {
  const view = useStreak();
  if (!view.ready) return <RopeHold className={className} />;
  if (view.best === 0 && !view.keptToday) return null;
  return <Rope view={view} card className={className} />;
}

/** The rope's height before the streak is read, only on a device that holds a kept day. */
function RopeHold({ className }: { className?: string }) {
  return <div aria-hidden data-rope-hold="" className={cn("hidden h-[92px] [html[data-kept]_&]:block", className)} />;
}

/** "N days" and its line over this week's knots; a tap opens the streak's sheet. */
function Rope({ view, card = false, className }: { view: StreakView; card?: boolean; className?: string }) {
  const { t, tn } = useTranslate();
  const [open, setOpen] = useState(false);
  const line = view.keptToday ? t("streak.rope.kept") : t("streak.rope.keep");
  const week = ropeWeek(view.strip, todayKey(), view.keptToday);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${tn("streak.count", view.current)}. ${line}`}
        aria-haspopup="dialog"
        className={cn(
          "tap-press flex w-full flex-col gap-[9px] text-start",
          // Today's rope stands on the page, without a box (1.9, the fifteen
          // screens); You's keeps its card until You is drawn (round 3).
          card
            ? "rounded-[17px] border border-paper/12 bg-paper/[0.035] px-3.5 pb-2.5 pt-3 transition-colors hover:bg-paper/[0.06]"
            : "px-1 pb-1 pt-2",
          className,
        )}
      >
        <span className="flex w-full items-center gap-2.5">
          <span
            aria-hidden
            hidden={view.current === 0}
            className={cn(
              "shrink-0 font-sans text-[20px] font-bold leading-none tabular-nums",
              view.keptToday ? "rope-count-lit text-paper" : view.current > 0 ? "text-paper/85" : "text-paper/50",
            )}
          >
            {tn("streak.days", view.current)}
          </span>
          <span aria-hidden className="min-w-0 flex-1 font-sans text-detail leading-snug text-paper/70">
            {line}
          </span>
          <svg
            aria-hidden
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-paper/55 rtl:-scale-x-100"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </span>
        <PrayerRope week={week} className="w-full" />
      </button>
      <StreakSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
