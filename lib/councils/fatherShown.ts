"use client";

import { useSyncExternalStore } from "react";

import { cameBack } from "@/lib/ui/scrollReset";

/**
 * The Father a council's row was showing, for the reader who comes back to
 * it (1.9, build 93 note 1).
 *
 * A council's page shows one of its Fathers on a card, chosen in the row
 * under it (components/councils/CouncilFathers.tsx). The owner chose St
 * Alexander, opened his page by the card and came back: the page was put
 * where he had left it, and the row had begun again at St Athanasius. Back
 * returns a page as the reader left it, and what they had chosen on it is
 * part of that.
 *
 * So the choice is kept, by the page's address, and given back only to a
 * reader who has come back by a step through history (lib/ui/scrollReset.ts,
 * cameBack). A visit that goes forward to the page begins at its first
 * Father, as it begins at its top.
 *
 * Kept for the visit, in memory: it is a place on a page, not a setting. By
 * name, not by number, so a row that has changed in between cannot show the
 * wrong Father.
 */
const kept = new Map<string, string>();

/** How many pages' choices are kept. A reader's way back is rarely this deep. */
const KEEP = 24;

/** The reader chose a Father on this page. */
export function keepFather(path: string, name: string): void {
  kept.delete(path);
  kept.set(path, name);
  while (kept.size > KEEP) {
    const oldest = kept.keys().next().value;
    if (oldest === undefined) break;
    kept.delete(oldest);
  }
}

/**
 * A visit that went forward to this page: whatever was chosen on an earlier
 * visit is let go, so a later step back to this one finds what this one left.
 */
export function forgetFather(path: string): void {
  kept.delete(path);
}

/** The Father chosen on this page, for a reader who has come back to it; none on a fresh visit. */
export function fatherKept(path: string): string | null {
  return cameBack() ? (kept.get(path) ?? null) : null;
}

const never = () => () => {};
const none = (): null => null;

/**
 * The Father to begin on. Read as the page is drawn, so a page reached by
 * Back is drawn with him already on its card (the link the reader tapped is
 * then there to be put back under their thumb, lib/ui/returnPlace.ts); none
 * on the server and while the page is first made live, where the first
 * Father is what the page was written with.
 */
export function useFatherKept(path: string): string | null {
  return useSyncExternalStore(never, () => fatherKept(path), none);
}

/** Test seam. */
export function resetFatherShownForTests(): void {
  kept.clear();
}
