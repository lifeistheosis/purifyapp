"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import type { StripDay } from "@/lib/streak/compute";
import { StreakFlame, type FlameState } from "./StreakFlame";

const FLAME: Record<StripDay["state"], FlameState> = {
  kept: "lit",
  saved: "ember",
  missed: "out",
  today: "pending",
};

const LABEL: Record<StripDay["state"], string> = {
  kept: "streak.dayKept",
  saved: "streak.daySaved",
  missed: "streak.dayMissed",
  today: "streak.dayToday",
};

/**
 * The last seven days under the flame: a lit flame for a day kept, an ember
 * for a day a save held, an empty outline for a day missed, and today's
 * dashed outline until it is kept.
 */
export function WeekStrip({ strip, className }: { strip: StripDay[]; className?: string }) {
  const { t, locale } = useTranslate();
  if (strip.length === 0) return null;
  const weekday = (date: string) => {
    try {
      return new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
    } catch {
      return "";
    }
  };
  const longDay = (date: string) => {
    try {
      return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
    } catch {
      return date;
    }
  };
  return (
    <ol aria-label={t("streak.weekAria")} className={cn("grid grid-cols-7 gap-1", className)}>
      {strip.map((d, i) => {
        const last = i === strip.length - 1;
        return (
          <li
            key={d.date}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl py-2",
              last && "bg-paper/[0.05] ring-1 ring-inset ring-paper/10",
            )}
            aria-label={t(LABEL[d.state], { day: longDay(d.date) })}
          >
            <span aria-hidden className={cn("font-sans text-eyebrow font-semibold uppercase", last ? "text-paper" : "text-paper/50")}>
              {weekday(d.date)}
            </span>
            <span aria-hidden className={cn("flex h-7 items-end", d.state === "missed" && "text-paper")}>
              <StreakFlame size={d.state === "kept" ? 24 : 22} state={FLAME[d.state]} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
