"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { useStreakWaits } from "@/lib/onboarding/useDayOne";
import { todayKey } from "@/lib/rhythm/dayKey";
import { atRiskShown, ropeWeek } from "@/lib/streak/rope";
import { useStreak } from "@/lib/streak/useStreak";
import { PrayerRope } from "./PrayerRope";
import { keepDayLinks } from "./StreakSheet";

/**
 * From 6 pm, while a streak is going and today is not kept: the prayer rope
 * with today's knot softly pulsing, and the two ways to keep it (1.8, after
 * the owner's pick B of round 5: the rope, with no red and no flame). It was
 * a red card with a pulsing flame. It never says the streak will be lost,
 * because a hidden save may catch it; it says what keeps it.
 *
 * On Today it waits while the Day 1 card shows (`waitsForDayOne`), as the
 * rope does (lib/streak/rope.ts). /prayers/today has no Day 1 card, so there
 * it shows whenever the evening asks.
 */
export function StreakAtRisk({ className, waitsForDayOne = false }: { className?: string; waitsForDayOne?: boolean }) {
  const { t, tn } = useTranslate();
  const view = useStreak();
  const dayOne = useStreakWaits();
  if (!atRiskShown(view, waitsForDayOne && dayOne)) return null;
  const links = keepDayLinks();
  const week = ropeWeek(view.strip, todayKey(), view.keptToday);
  return (
    <section
      aria-labelledby="streak-at-risk"
      className={cn("px-1 pb-1 pt-2", className)}
    >
      <h2 id="streak-at-risk" className="sr-only">
        {tn("streak.atRiskTitle", view.current)}
      </h2>
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="shrink-0 font-sans text-[20px] font-bold leading-none tabular-nums text-paper/85">
          {tn("streak.days", view.current)}
        </span>
        <p className="min-w-0 flex-1 font-sans text-detail leading-snug text-paper/70">{t("streak.atRiskBody")}</p>
      </div>
      <PrayerRope week={week} pulse className="mt-[9px]" />
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <Link
          href={links.pray}
          className="inline-flex min-h-11 items-center justify-center rounded-pill border border-paper/25 px-4 font-sans text-detail font-semibold text-paper hover:border-paper/45"
        >
          {t("streak.pray")}
        </Link>
        <Link
          href={links.read}
          className="inline-flex min-h-11 items-center justify-center rounded-pill border border-paper/25 px-4 font-sans text-detail font-semibold text-paper hover:border-paper/45"
        >
          {t("streak.read")}
        </Link>
      </div>
    </section>
  );
}
