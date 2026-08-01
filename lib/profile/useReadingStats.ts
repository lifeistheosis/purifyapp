"use client";

// The four counters shown on the You tab and on the desktop account
// dashboard. One implementation, so the two surfaces cannot disagree about
// how much a reader has gathered.
//
// Bookmarks come from lib/bookmarks.ts rather than a fourth raw read of
// `purify:bookmarks`, so the count matches what /saved actually lists,
// including its de-duplication by locator.

import { useEffect, useState } from "react";

import { useBookmarks } from "@/lib/bookmarks";
import { readAnnotationCounts, type AnnotationCounts } from "./readingStats";

export type ReadingStats = AnnotationCounts & { bookmarks: number };

const ZERO: AnnotationCounts = { verses: 0, paragraphs: 0, notes: 0 };

/**
 * Zeroes on the first frame, then the real counts after mount. Deliberately
 * useEffect and not useSyncExternalStore: a full localStorage scan cannot
 * return a referentially stable snapshot without a dirty flag, and an
 * unstable snapshot in useSyncExternalStore is an infinite render loop.
 */
export function useReadingStats(): ReadingStats {
  const [counts, setCounts] = useState<AnnotationCounts>(ZERO);
  const { bookmarks } = useBookmarks();

  useEffect(() => {
    function recompute() {
      setCounts(readAnnotationCounts());
    }
    recompute();
    window.addEventListener("purify:annotation", recompute);
    window.addEventListener("storage", recompute);
    return () => {
      window.removeEventListener("purify:annotation", recompute);
      window.removeEventListener("storage", recompute);
    };
  }, []);

  return { ...counts, bookmarks: bookmarks.length };
}
