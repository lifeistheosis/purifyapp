"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { useStreak } from "@/lib/streak/useStreak";
import { StreakFlame } from "./StreakFlame";
import { keepDayLinks } from "./StreakSheet";

/**
 * From 6 pm, while a streak is going and today is not kept: a red card on
 * Today with the count and the two ways to keep it. It never says the
 * streak will be lost, because a hidden save may catch it; it says what
 * keeps it.
 */
export function StreakAtRisk({ className }: { className?: string }) {
  const { t, tn } = useTranslate();
  const view = useStreak();
  if (!view.ready || !view.atRisk) return null;
  const links = keepDayLinks();
  return (
    <section
      aria-labelledby="streak-at-risk"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-streak/40 bg-[linear-gradient(135deg,rgb(193_39_45/0.22),rgb(193_39_45/0.06))] p-4",
        className,
      )}
    >
      <div className="flex items-center gap-3.5">
        <span className="streak-pulse inline-flex shrink-0">
          <StreakFlame size={44} state="pending" />
        </span>
        <div className="min-w-0">
          <p id="streak-at-risk" role="heading" aria-level={2} className="font-sans text-ui font-bold text-streak">
            {tn("streak.atRiskTitle", view.current)}
          </p>
          <p className="mt-0.5 font-sans text-detail leading-snug text-paper/80">{t("streak.atRiskBody")}</p>
        </div>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <Link
          href={links.pray}
          className="inline-flex min-h-11 items-center justify-center rounded-pill bg-crimson px-4 font-sans text-detail font-semibold text-white"
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
