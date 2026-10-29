"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PrayerRope } from "@/components/streak/PrayerRope";
import { StreakSheet } from "@/components/streak/StreakSheet";
import { cn } from "@/lib/cn";
import { useDayOneShown } from "@/lib/onboarding/useDayOne";
import { todayKey } from "@/lib/rhythm/dayKey";
import { ropeRow, ropeWeek } from "@/lib/streak/rope";
import { useStreak } from "@/lib/streak/useStreak";

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
  const { t, tn } = useTranslate();
  const view = useStreak();
  const dayOne = useDayOneShown();
  const [open, setOpen] = useState(false);
  const place = ropeRow(view, dayOne);
  if (place === "none") return null;
  // The rope's height, held before the streak is read, so the cards under it
  // do not jump when it lands.
  if (place === "hold") return <div aria-hidden className={cn("h-[92px]", className)} />;
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
          "tap-press flex w-full flex-col gap-[9px] rounded-[17px] border border-paper/12 bg-paper/[0.035] px-3.5 pb-2.5 pt-3 text-left transition-colors hover:bg-paper/[0.06]",
          className,
        )}
      >
        <span className="flex w-full items-center gap-2.5">
          <span
            aria-hidden
            className={cn(
              "shrink-0 font-sans text-[20px] font-bold leading-none tabular-nums",
              view.keptToday ? "rope-count-lit text-paper" : view.current > 0 ? "text-paper/85" : "text-paper/50",
            )}
          >
            {tn("streak.days", view.current)}
          </span>
          <span aria-hidden className="min-w-0 flex-1 font-sans text-detail leading-snug text-paper/60">
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
            className="shrink-0 text-paper/40 rtl:-scale-x-100"
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
