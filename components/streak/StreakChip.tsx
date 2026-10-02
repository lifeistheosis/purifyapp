"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { StreakFlame } from "./StreakFlame";

/**
 * The streak on a profile, beside the @handle: the red flame and the exact
 * count, "23-day streak". Shown only while the streak is going.
 */
export function StreakChip({ days, className }: { days: number; className?: string }) {
  const { tn } = useTranslate();
  if (days <= 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border border-streak/25 bg-streak/[0.12] py-0.5 pl-1.5 pr-2 font-sans text-caption font-bold leading-none text-streak",
        className,
      )}
    >
      <StreakFlame size={13} />
      <span className="tabular-nums">{tn("streak.count", days)}</span>
    </span>
  );
}
