"use client";

// One chip of a filter row (1.7: Saved and the journal), in the look of the
// Chants library's chips: an outline at rest, paper when chosen. Put a row of
// them in a ChipScroller, which scrolls them sideways on a phone. 36px drawn,
// a 44px touch box (.hit-44).

import { cn } from "@/lib/cn";

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "tap-press hit-44 inline-flex min-h-9 items-center rounded-pill border px-4 font-sans text-detail font-semibold motion-safe:transition-colors",
        active ? "border-paper bg-paper text-night" : "border-paper/15 text-paper/70 hover:border-paper/35 hover:text-paper",
      )}
    >
      {children}
    </button>
  );
}
