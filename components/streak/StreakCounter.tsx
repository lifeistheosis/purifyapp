"use client";

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { tierLevel } from "@/lib/streak/tiers";
import { useStreak } from "@/lib/streak/useStreak";
import { haptic } from "@/lib/ui/motion";
import { StreakFlame } from "./StreakFlame";
import { StreakSheet } from "./StreakSheet";

/**
 * The streak in the phone's tab bar (MobileHeader): a drawn flame and the
 * count, right after the Premium pill, on all five tabs. The owner,
 * 2026-10-17: "can you put the streak at the top, like right next to plus?
 * Just added like a fireball and a counter." A tap opens the streak sheet,
 * with every flame the streak grows through.
 *
 * The flame is the streak's own (lib/streak/tiers.ts): lit once today is
 * kept, its unlit outline until then, pulsing from 6 pm while an unkept day
 * runs out, as on You. It is there for every reader, as the streak is: a
 * reader with no account keeps a streak on the device, and the sheet offers
 * to keep it on every device. At no streak it is the grey flame and 0, as the
 * Today row and the You card show it: the count a reader starts from.
 *
 * The 44px box holds the touch target; what shows is narrower, so the tab's
 * name keeps its room on a small phone (MobileHeader fits the name).
 */
export function StreakCounter() {
  const { tn } = useTranslate();
  const view = useStreak();
  const [open, setOpen] = useState(false);
  // The box before the streak is read on the device, so nothing in the bar
  // moves when it lands.
  if (!view.ready) return <span aria-hidden className="inline-block h-11 w-10 shrink-0" />;
  const state = view.current === 0 ? "out" : view.keptToday ? "lit" : "pending";
  return (
    <>
      <button
        type="button"
        onClick={() => {
          haptic("light");
          setOpen(true);
        }}
        aria-label={tn("streak.count", view.current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="tap-press inline-flex h-11 min-w-10 shrink-0 items-center justify-center gap-[3px] rounded-pill px-1 focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2"
      >
        <span aria-hidden className={cn("inline-flex", view.atRisk && "streak-pulse", state === "out" && "text-paper")}>
          <StreakFlame size={17} state={state} tier={tierLevel(view.current)} />
        </span>
        <span
          aria-hidden
          className={cn(
            "font-sans text-ui font-bold leading-none tabular-nums",
            view.current > 0 ? "text-streak" : "text-paper/50",
          )}
        >
          {view.current}
        </span>
      </button>
      <StreakSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
