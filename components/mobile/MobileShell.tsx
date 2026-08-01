import type { ReactNode } from "react";

/**
 * Shared mobile shell — header + scrolling body + eyebrow.
 *
 * Every mobile screen (Today, Bible, Discover, Prayers, You) renders inside
 * this so the visual language stays identical: a dark night surface, a
 * sticky-feeling header strip (slot), a short uppercase eyebrow, a
 * vertical timeline rail of cards.
 *
 * Server component; interactive bits live inside the children.
 */
export function MobileShell({
  header,
  eyebrow,
  children,
}: {
  /** Top header (top tabs OR a "Bible / Discover / Prayers / You" title row). */
  header: ReactNode;
  /** Small uppercase caption above the timeline (e.g. "Daily Refresh").
      Optional: screens that lead with their own masthead can omit it. */
  eyebrow?: string;
  /** Stacked cards. Use `MobileTimeline` or render plain children. */
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col bg-night md:hidden">
      {header}
      {/* The entrance for Bible, Discover, Prayers, Reading and You, in one
          place. `cascade` staggers the direct children in reading order,
          `cascade-tight` shortens the step because this is a screen arriving
          rather than a list settling, and `cascade-rise` adds the small
          upward travel. Safe to translate here: the one `fixed` element in
          this tree (BibleSearchOverlay) renders in the header slot above,
          outside this wrapper. Do not add `cascade-rise` to a reader route,
          whose pills, toolbar and sheets are fixed and not portaled. */}
      <div className="cascade cascade-tight cascade-rise px-5 pt-6 pb-10">
        {eyebrow && (
          <p className="font-sans text-eyebrow uppercase tracking-[2px] text-paper/55 mb-4">
            {eyebrow}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
