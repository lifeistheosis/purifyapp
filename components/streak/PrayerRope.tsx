"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { dateLocale } from "@/lib/i18n/deviceDates";
import type { Knot } from "@/lib/streak/rope";

/**
 * The prayer rope (1.8): the owner's pick B of round 5, "The prayer rope, a
 * knot a day" (Homebase/boards/purify-master/r18/choose/5b-streak-new.png).
 * Seven knots on one line for this week, Monday first, each day's letter
 * under its knot in the reader's language. A day kept is a knot tied, filled
 * white; today, once kept, is lit with a soft white glow; a day a hidden save
 * held is a softer fill; the rest are open. `pulse` sets today's open knot
 * breathing, for the evening card (StreakAtRisk). No flame and no red.
 *
 * The week is lib/streak/rope.ts (ropeWeek). For the eye only: the row it
 * sits in says the count and the line to a screen reader, and the streak's
 * sheet reads each day out.
 */
export function PrayerRope({
  week,
  pulse = false,
  className,
}: {
  week: readonly Knot[];
  pulse?: boolean;
  className?: string;
}) {
  const { locale } = useTranslate();
  if (week.length === 0) return null;
  let letter: (date: string) => string = () => "";
  try {
    const narrow = new Intl.DateTimeFormat(dateLocale(locale), { weekday: "narrow", timeZone: "UTC" });
    letter = (date) => narrow.format(new Date(`${date}T12:00:00Z`));
  } catch {
    // An engine without the locale's day names: the knots alone.
  }
  return (
    <span aria-hidden className={cn("relative flex justify-between px-1.5", className)}>
      {/* The cord, through the knots' middles. */}
      <span className="absolute inset-x-3 top-2 h-[1.5px] bg-paper/16" />
      {week.map((knot) => (
        <span key={knot.date} className="relative flex w-[18px] flex-col items-center gap-[5px]">
          <span className={knotLook(knot, pulse)} />
          <span
            className={cn(
              "font-sans text-[10.5px] font-semibold leading-none",
              knot.today ? (knot.state === "kept" ? "text-paper/90" : "text-paper/80") : "text-paper/40",
            )}
          >
            {letter(knot.date)}
          </span>
        </span>
      ))}
    </span>
  );
}

function knotLook(knot: Knot, pulse: boolean): string {
  // Today kept: larger, filled, lit (.rope-knot-lit in globals.css).
  if (knot.today && knot.state === "kept") return "size-[17px] rounded-full bg-paper rope-knot-lit";
  const knotted = "mt-0.5 size-[13px] rounded-full";
  if (knot.state === "kept") return cn(knotted, "bg-paper");
  if (knot.state === "saved") return cn(knotted, "border-[1.5px] border-paper/45 bg-paper/30");
  if (knot.today) return cn(knotted, "border-[1.5px] border-paper/55 bg-night", pulse && "rope-knot-pulse");
  return cn(knotted, "border-[1.5px] border-paper/28 bg-night");
}
