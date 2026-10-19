"use client";

// The quiet moment at the end of a guided flow (1.7, the owner's note 22:
// "an animation when you finish"): a paper circle whose check draws itself,
// a line in Lora that says what was done, and one small line under it. No
// burst, no overshoot, nothing that congratulates: the app confirms (the
// note on .check-draw in globals.css). With motion off the check is simply
// there.
//
// A reading plan's finished day is its first user (components/plans/
// PlanFinish.tsx); the readings flow and the prayer rules can take it later.

import { Check } from "@/components/ui/icons/Check";
import { cn } from "@/lib/cn";

export function FinishMoment({
  title,
  line,
  className,
  headingId,
}: {
  title: string;
  line?: string | null;
  className?: string;
  /** So a section can take its name from the heading. */
  headingId?: string;
}) {
  return (
    <div role="status" className={cn("flex flex-col items-center text-center", className)}>
      <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-paper text-night">
        <Check size={26} strokeWidth={2.2} className="check-draw finish-draw" />
      </span>
      <h2 id={headingId} className="mt-5 text-title-sm font-bold leading-tight text-paper">
        {title}
      </h2>
      {line ? <p className="mt-1.5 font-sans text-detail text-paper/60">{line}</p> : null}
    </div>
  );
}
