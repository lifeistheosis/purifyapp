"use client";

// Fourteen days of a practice, as fourteen dots.
//
// This is the only progress mark in Purify and its grammar is deliberate.
//
//   - A kept day is a filled gold dot.
//   - An unkept PAST day is a faint dot. Absence, not failure. Never red,
//     never an outline, never a gap. A reader looking back at a hard fortnight
//     should see a quiet row, not a report card.
//   - TODAY, while unkept, is a hairline ring rather than a faint dot. The day
//     is not over, so it must not read as a miss. lib/fasting/streak.ts
//     already encodes this exact forgiveness ("today, if left unmarked, is
//     forgiven"); this is the visual form of it.
//
// There is no count, no percentage, no streak number, and no "9 of 14". The
// label names the practice. If you are about to add a number here, read the
// doctrine comments in PrayNowCard and OnboardingFlow first: the whole point
// is that keeping the day makes the surface quieter, not louder.
//
// The dots are aria-hidden as a group and the row carries one qualitative
// label, because fourteen individual dots announced one by one is noise to a
// screen reader, and a count would reintroduce scoring through the back door.

import { cn } from "@/lib/cn";

export type RhythmDay = { date: string; kept: boolean };

export function RhythmRow({
  days,
  label,
  todayKey,
  className,
}: {
  days: RhythmDay[];
  /** Names the practice, e.g. "the Morning Rule, these two weeks". */
  label: string;
  /** The `YYYY-MM-DD` that is today, so it can be drawn unfilled-but-open. */
  todayKey?: string;
  className?: string;
}) {
  if (days.length === 0) return null;

  return (
    <p className={cn("flex items-center gap-2", className)}>
      <span className="flex items-center gap-[5px]" aria-hidden>
        {days.map((d) => {
          const isToday = d.date === todayKey;
          return (
            <span
              key={d.date}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                d.kept
                  ? "bg-gold"
                  : isToday
                    ? "ring-1 ring-paper/20"
                    : "bg-paper/12",
              )}
            />
          );
        })}
      </span>
      <span className="font-sans text-caption text-paper/55">{label}</span>
    </p>
  );
}
