"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { useStreak } from "@/lib/streak/useStreak";
import { StreakFlame } from "@/components/streak/StreakFlame";
import { StreakSheet } from "@/components/streak/StreakSheet";

/**
 * The streak on Today, as a row under the greeting: the flame, the count and
 * one sentence that says what to do. A tap opens the streak sheet.
 *
 * Until 1.7 the streak was a flame and a number in Today's top bar (the
 * owner's call of 2026-10-02, a red streak on Today). On 2026-10-07 he marked
 * the layout row that turns it into a row with a sentence, the way Hallow's
 * Me tab opens, and a top bar of three things; on 2026-10-15 he picked this
 * Today ("B"). The streak stays on Today, red once it is going.
 *
 * Every sentence is one the streak sheet already says (`streak.*`), so the
 * row adds no words. From 6 pm an unkept, going streak has its own red card
 * with the two ways to keep it (StreakAtRisk); the row gives way to it rather
 * than say the same thing twice.
 */
export function StreakRow({ className }: { className?: string }) {
  const { t, tn } = useTranslate();
  const view = useStreak();
  const [open, setOpen] = useState(false);
  // The row's height, held before the streak is read, so the verse under it
  // does not jump when it lands.
  if (!view.ready) return <div aria-hidden className={cn("h-[58px]", className)} />;
  if (view.atRisk) return null;
  const state = view.current === 0 ? "out" : view.keptToday ? "lit" : "pending";
  const line =
    view.current === 0 ? t("streak.start") : view.keptToday ? t("streak.keptToday") : t("streak.notYet");
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${tn("streak.count", view.current)}. ${line}`}
        className={cn(
          "tap-press flex min-h-[58px] w-full items-center gap-3 rounded-[17px] border px-3.5 py-2.5 text-left transition-colors",
          view.keptToday
            ? "border-streak/30 bg-streak/[0.07] hover:bg-streak/[0.1]"
            : "border-paper/10 bg-paper/[0.03] hover:bg-paper/[0.06]",
          className,
        )}
      >
        <span aria-hidden className={cn("inline-flex shrink-0", state === "out" && "text-paper")}>
          <StreakFlame size={26} state={state} />
        </span>
        <span
          aria-hidden
          className={cn(
            "shrink-0 font-sans text-[22px] font-bold leading-none tabular-nums",
            view.current > 0 ? "text-streak" : "text-paper/45",
          )}
        >
          {view.current}
        </span>
        <span aria-hidden className="min-w-0 flex-1 font-sans text-detail leading-snug text-paper/80">
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
          className="shrink-0 text-paper/40"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
      <StreakSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
