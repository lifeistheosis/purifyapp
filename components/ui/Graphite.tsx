// The front page's section language, in one place: the small uppercase
// eyebrow over a section, the graphite card ("Paths to walk"), its icon tile
// and its call to action, and the pill used for quick ways in.
//
// First written inline on Discover (2026-09-26, redone at the owner's
// request); the Prayers hub uses the same pieces, so they live here now. The
// card turns to paper on Light through lm-card (app/globals.css, "Light mode:
// surfaces drawn for dark"), so its dark gradient never shows on paper.
//
// Override any of these with cn(), never by appending to the string: two
// paddings or two margins in one class list resolve by stylesheet order, not
// by which came last.

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** The small uppercase eyebrow that leads a section. Give it a `level`
 *  when it is the section's heading, so the outline has one. It stays a
 *  <p> with a heading role because app/globals.css sets every h1 to h6 in
 *  the serif heading face, unlayered, which no utility class can undo. */
export function Eyebrow({
  children,
  className,
  level,
}: {
  children: ReactNode;
  className?: string;
  level?: 2 | 3;
}) {
  return (
    <p
      className={cn("font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/60", className)}
      {...(level ? { role: "heading", "aria-level": level } : {})}
    >
      {children}
    </p>
  );
}

/** The graphite card. Pair with style={CARD_BG}. */
export const CARD =
  "lm-card group relative flex flex-col overflow-hidden rounded-[28px] p-7 ring-1 ring-inset ring-paper/10 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.5)] transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-8";

export const CARD_BG = {
  background:
    "radial-gradient(115% 90% at 88% 8%, rgba(255,255,255,0.06) 0%, transparent 55%), linear-gradient(155deg, #26262b 0%, #1a1a1d 60%, #151518 100%)",
};

export const ICON_TILE =
  "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-paper/[0.07] text-paper/85 ring-1 ring-inset ring-paper/10";

/** The same tile at 40px, for rows and stat cards. Decoration, never a control. */
export const ICON_TILE_SM =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper/[0.07] text-paper/85 ring-1 ring-inset ring-paper/10";

export const CTA = "mt-6 font-sans text-detail font-medium text-paper/75 transition-colors group-hover:text-paper";

/** A quick way in: an outlined pill, 44px tall. */
export const PILL =
  "inline-flex min-h-11 items-center rounded-pill border border-paper/15 bg-paper/[0.04] px-5 py-2.5 font-sans text-ui font-medium text-paper transition-colors duration-150 hover:border-paper/30 hover:bg-paper/10";
