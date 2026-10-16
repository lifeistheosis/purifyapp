import type { ComponentProps, ReactNode } from "react";

import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { cn } from "@/lib/cn";

/**
 * One pill for every control in the reader's row (1.7, the owner's notes 2
 * and 3 of 2026-10-16: the chips looked loose, "not side by side, not
 * clean", at three heights with two kinds of label). Every pill is 40px tall
 * with a 44px touch box (.hit-44), one face and one size of type, and says
 * only its value: "KJV", "John", "Interlinear". A pill that opens a picker
 * ends in the drawn chevron; a toggle that is on is filled.
 *
 * The phone's and the tablet's row (Translation, Book, Interlinear) and the
 * computer's toolbar are built from it, so the two rows line up the same
 * way. `readerPillClass` gives the same look to a control that is not a
 * plain button.
 */
export function readerPillClass({ pressed = false, chevron = false }: { pressed?: boolean; chevron?: boolean } = {}): string {
  return cn(
    // 12.75px at the sides (the root is 17px): the three pills of a narrow
    // phone's row, "Brenton LXX", "Genesis" and "Interlinear", fit 360px
    // with room to spare.
    "tap-press hit-44 inline-flex h-10 min-w-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-3 font-sans text-detail font-medium",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
    // The chevron's drawing sits inside its box, so it reaches into the
    // padding and the two ends of the pill look the same.
    chevron && "pe-2.5",
    pressed
      ? "border-gold bg-gold text-night hover:bg-gold-soft"
      : "border-paper/15 bg-paper/[0.04] text-paper hover:border-paper/30 hover:bg-paper/10",
  );
}

export function ReaderPill({
  pressed = false,
  chevron = false,
  className,
  children,
  ...rest
}: Omit<ComponentProps<"button">, "type" | "children"> & {
  /** Filled: a toggle that is on. Pass aria-pressed with it. */
  pressed?: boolean;
  /** Ends in the drawn chevron: the pill opens a picker. */
  chevron?: boolean;
  children: ReactNode;
}) {
  return (
    <button type="button" {...rest} className={cn(readerPillClass({ pressed, chevron }), className)}>
      {children}
      {chevron ? <ChevronDown size={14} className="-me-1 shrink-0 text-paper/55" /> : null}
    </button>
  );
}
