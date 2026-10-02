"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { useStreak } from "@/lib/streak/useStreak";
import { StreakFlame } from "./StreakFlame";
import { StreakSheet } from "./StreakSheet";

/**
 * The streak in a top bar: the flame and the count, red. The flame is lit
 * once today is kept and a dashed outline until then, and from 6 pm an
 * unkept day makes it pulse. A tap opens the streak sheet.
 */
export function StreakCounter({ className }: { className?: string }) {
  const { tn } = useTranslate();
  const view = useStreak();
  const [open, setOpen] = useState(false);
  if (!view.ready) return <span aria-hidden className={cn("inline-block h-10 w-12", className)} />;
  const state = view.current === 0 ? "out" : view.keptToday ? "lit" : "pending";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={tn("streak.count", view.current)}
        className={cn(
          "tap-press hit-44 inline-flex h-10 items-center gap-1.5 rounded-full pl-2 pr-3 transition-colors hover:bg-paper/[0.06]",
          view.atRisk && "bg-streak/[0.1] ring-1 ring-inset ring-streak/35",
          className,
        )}
      >
        <span className={cn("inline-flex", view.atRisk && "streak-pulse", state === "out" && "text-paper")}>
          <StreakFlame size={22} state={state} />
        </span>
        <span
          className={cn(
            "font-sans text-ui font-bold tabular-nums",
            view.current > 0 ? "text-streak" : "text-paper/45",
          )}
        >
          {view.current}
        </span>
      </button>
      <StreakSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
