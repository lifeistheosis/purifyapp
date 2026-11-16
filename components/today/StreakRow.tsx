"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PrayerRope } from "@/components/streak/PrayerRope";
import { StreakSheet, keepDayLinks } from "@/components/streak/StreakSheet";
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
 * view whatever the hour.
 *
 * Since round 3 of the fifteen screens (build 98 note 11) it stands on the
 * page there too, without a box, as one piece with what the week held
 * (`children`, components/you/LifeKept.tsx): the streak is said once on the
 * screen. And with no day kept yet, `invite` puts one invitation in words in
 * its place, the way to the hour's prayer: never "0 days", never seven open
 * knots.
 */
export function StreakRope({ className, invite = false, children }: { className?: string; invite?: boolean; children?: ReactNode }) {
  const view = useStreak();
  if (!view.ready) return <RopeHold className={className} />;
  if (view.best === 0 && !view.keptToday) return invite ? <RopeInvite className={className} /> : null;
  return (
    <Rope view={view} className={className}>
      {children}
    </Rope>
  );
}

/** No day kept yet: the invitation, in the words the streak's sheet has always used, and the way to the hour's prayer. */
function RopeInvite({ className }: { className?: string }) {
  const { t } = useTranslate();
  return (
    <Link href={keepDayLinks().pray} data-rope-invite="" className={cn("tap-press flex min-h-11 w-full items-center gap-2.5 px-1 py-1 text-start", className)}>
      <span className="min-w-0 flex-1 font-sans text-ui leading-snug text-paper/85">{t("streak.start")}</span>
      <Chevron />
    </Link>
  );
}

/** The way on, turned for a page read right to left. */
function Chevron() {
  return (
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
  );
}

/** The rope's height before the streak is read, only on a device that holds a kept day. */
function RopeHold({ className }: { className?: string }) {
  return <div aria-hidden data-rope-hold="" className={cn("hidden h-[92px] [html[data-kept]_&]:block", className)} />;
}

/** "N days" and its line over this week's knots; a tap opens the streak's sheet. `children` stand under the knots, part of the piece. */
function Rope({ view, className, children }: { view: StreakView; className?: string; children?: ReactNode }) {
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
        // The rope stands on the page, without a box: on Today since round 1
        // of the fifteen screens, on You since round 3.
        className={cn("tap-press flex w-full flex-col gap-[9px] px-1 pb-1 pt-2 text-start", className)}
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
          <Chevron />
        </span>
        <PrayerRope week={week} className="w-full" />
      </button>
      {children}
      <StreakSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
