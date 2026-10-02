"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { useStreak } from "@/lib/streak/useStreak";
import { StreakFlame } from "./StreakFlame";
import { StreakSheet } from "./StreakSheet";
import { WeekStrip } from "./WeekStrip";

/**
 * The streak on the You screen: the flame, the count, the best, and the
 * week. The count opens the streak sheet.
 */
export function StreakCard({ className }: { className?: string }) {
  const { t, tn } = useTranslate();
  const view = useStreak();
  const [open, setOpen] = useState(false);
  if (!view.ready) return <div aria-hidden className={cn("h-[168px] rounded-2xl border border-paper/10 bg-paper/[0.03]", className)} />;
  const state = view.current === 0 ? "out" : view.keptToday ? "lit" : "pending";
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        view.current > 0 ? "border-streak/30 bg-streak/[0.07]" : "border-paper/10 bg-paper/[0.03]",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap-press -m-1 flex w-[calc(100%+0.5rem)] items-center gap-3.5 rounded-xl p-1 text-left transition-colors hover:bg-paper/[0.04]"
      >
        <span className={cn("inline-flex shrink-0", view.atRisk && "streak-pulse", state === "out" && "text-paper")}>
          <StreakFlame size={46} state={state} />
        </span>
        <span className="min-w-0">
          <span
            className={cn(
              "block font-sans text-title font-bold leading-none tabular-nums",
              view.current > 0 ? "text-streak" : "text-paper/45",
            )}
          >
            {tn("streak.count", view.current)}
          </span>
          <span className="mt-1.5 block font-sans text-detail text-paper/60">
            {view.keptToday ? t("streak.keptShort") : view.current > 0 ? t("streak.notYetShort") : t("streak.startShort")}
            {view.best > 0 ? ` · ${tn("streak.best", view.best)}` : ""}
          </span>
        </span>
      </button>
      <WeekStrip strip={view.strip} className="mt-3" />
      <StreakSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
