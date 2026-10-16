import type { ReactNode } from "react";

/**
 * The prayer section's closing note (sourcing, help wanted, a sign-in nudge),
 * as the Prayers landing ends.
 *
 * This file held the section's book-page primitives until 1.7: a masthead
 * with an eyebrow and a short gold rule, hairline index rows with an arrow
 * drawn as a character, and a page frame with desktop padding. The owner's
 * note 16 of 2026-10-16 ("the pages under Prayers are desktop pages shrunk")
 * retired them: each page under Prayers is a phone page now, with its own bar
 * (MobileTopBar) and the shared pieces of components/prayers (ArtPlate,
 * DayTimeline, the prayer reader's head).
 */
export function PrayerNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-14 font-sans text-caption text-paper/55 leading-[1.7]">
      {children}
    </p>
  );
}
