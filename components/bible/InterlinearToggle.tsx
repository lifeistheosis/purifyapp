"use client";

import { useInterlinear } from "@/lib/bible/interlinear";
import { cn } from "@/lib/cn";

export function InterlinearToggle({ className }: { className?: string }) {
  const { on, toggle } = useInterlinear();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Hide interlinear Greek" : "Show interlinear Greek"}
      className={cn(
        "shrink-0 inline-flex items-center gap-2 rounded-pill border px-4 h-[44px] sm:h-[42px] font-sans text-ui font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-[3px]",
        on
          ? "border-gold text-night bg-gold hover:bg-[#c89e2c]"
          : "border-paper/15 bg-paper/[0.04] text-paper/85 hover:bg-paper/10 hover:border-paper/30",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block w-2 h-2 rounded-full transition-colors duration-150",
          on ? "bg-night" : "bg-paper/30",
        )}
      />
      <span>Interlinear</span>
    </button>
  );
}
