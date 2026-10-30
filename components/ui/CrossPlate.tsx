import type { CSSProperties } from "react";

import { Cross } from "@/components/ui/icons/Cross";
import { cn } from "@/lib/cn";

/**
 * The quiet plate in a picture's place (1.8): the page's dark ground, the
 * three-bar cross at its middle glowing white, and, where there is room, one
 * line under it (a chant's languages, in their own scripts). Black, white and
 * grey only, drawn from the page's tokens so every palette has it; on
 * Parchment the cross is the plain ink, as white cannot glow there
 * (app/globals.css, .cross-plate-mark). Never a picture made for the plate.
 *
 * For anything with no picture of its own, so nothing shows an empty box: a
 * chant with no cover (components/chants/ChantCover.tsx), and what is
 * playing when it has none or its picture cannot load (CoverArt, RingCover,
 * Now Playing). The coordinator's walk of 2026-10-30 found the Chants home
 * opening on a blank grey square.
 *
 * Decorative: whatever it stands beside names what it is.
 */
export type CrossPlateSize = "hero" | "card" | "thumb" | "disc";

/** How wide the cross is drawn, as a share of the plate's width. */
export const CROSS_SHARE: Record<CrossPlateSize, string> = {
  hero: "w-[30%]",
  card: "w-[34%]",
  thumb: "w-[46%]",
  disc: "w-[52%]",
};

export function CrossPlate({
  size,
  caption,
  className,
  style,
}: {
  size: CrossPlateSize;
  /** One quiet line under the cross, on a plate large enough to read it. */
  caption?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const line = caption && (size === "hero" || size === "card") ? caption : null;
  return (
    <span
      aria-hidden
      data-cover="plate"
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden bg-night-soft ring-1 ring-inset ring-paper/10",
        className,
      )}
      style={style}
    >
      {/* A breath of light behind the cross, the ground's own grey. */}
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgb(255_255_255/0.07),transparent_62%)]" />
      <Cross size={24} strokeWidth={1.4} className={cn("cross-plate-mark relative h-auto text-paper", CROSS_SHARE[size])} />
      {line ? (
        <span
          dir="auto"
          className={cn(
            "absolute inset-x-0 bottom-0 truncate px-3 text-center font-sans text-paper/55",
            size === "hero" ? "pb-4 text-detail" : "pb-2.5 text-caption",
          )}
        >
          {line}
        </span>
      ) : null}
    </span>
  );
}
