// The historical-certainty label. Shown wherever a claim's firmness
// materially affects how it should be read, cards, context rail, event
// pages. Text-first (never color-only) per the accessibility rules.

import { certaintyById, type Certainty } from "@/lib/history/events";
import { cn } from "@/lib/cn";

export function CertaintyBadge({
  certainty,
  withGloss = false,
  className,
}: {
  certainty: Certainty;
  withGloss?: boolean;
  className?: string;
}) {
  const level = certaintyById(certainty);
  return (
    <span className={cn("inline-flex flex-col", className)}>
      <span
        className="inline-flex w-fit items-center gap-1.5 rounded-pill border border-paper/20 px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[1.4px] text-paper/65"
        title={withGloss ? undefined : level.gloss}
      >
        {level.label}
      </span>
      {withGloss ? (
        <span className="mt-1.5 font-sans text-caption text-paper/55 leading-[1.5]">
          {level.gloss}
        </span>
      ) : null}
    </span>
  );
}
