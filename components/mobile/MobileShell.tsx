import type { ReactNode } from "react";

/**
 * Shared mobile shell — header + scrolling body + eyebrow.
 *
 * The four tabs under the (app) frame (Bible, Discover, Prayers, You) and
 * Reading render inside this so the visual language stays identical: a dark
 * night surface, the tab bar every tab wears (MobileHeader, which Today
 * mounts in its own shell), a short eyebrow, then the screen's cards.
 *
 * Server component; interactive bits live inside the children.
 */
export function MobileShell({
  header,
  eyebrow,
  children,
}: {
  /** The tab bar: <MobileHeader titleKey="nav.bible" /> and its siblings. */
  header: ReactNode;
  /** Small uppercase caption above the timeline (e.g. "Daily Refresh").
      Optional: screens that lead with their own masthead can omit it. */
  eyebrow?: ReactNode;
  /** Stacked cards. Use `MobileTimeline` or render plain children. */
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col bg-night md:hidden native-md-flex">
      {header}
      {/* The entrance for Bible, Discover, Prayers, Reading and You, in one
          place. `cascade` staggers the direct children in reading order,
          `cascade-tight` shortens the step because this is a screen arriving
          rather than a list settling, and `cascade-rise` adds the small
          upward travel. Safe to translate here: nothing in this tree is
          `fixed` (the search the header opens is mounted in the layout,
          outside this wrapper). Do not add `cascade-rise` to a reader route,
          whose pills, toolbar and sheets are fixed and not portaled. */}
      <div className="cascade cascade-tight cascade-rise px-5 pt-6 pb-10 md:mx-auto md:w-full md:max-w-[760px] lg:max-w-[880px]">
        {eyebrow && (
          <p className="font-sans text-caption text-paper/55 mb-4">
            {eyebrow}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
