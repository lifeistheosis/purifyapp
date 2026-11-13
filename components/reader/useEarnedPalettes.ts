"use client";

import { useMemo } from "react";

import { earnedPalettes, earnedSoFar, type EarnedPalettes } from "@/lib/reader/earned";
import { useReadingProgress } from "@/lib/reading/progress";
import { useReadToEnd } from "@/lib/reading/readToEnd";

/**
 * How far this reader is towards the Councils and Cappadocian palettes
 * (lib/reader/earned.ts), from what this device keeps. Nothing earned in the
 * first draw, so a page drawn into the export and its first draw agree.
 */
export function useEarnedPalettes(): EarnedPalettes {
  const ends = useReadToEnd();
  const progress = useReadingProgress();
  return useMemo(() => earnedPalettes(ends, progress), [ends, progress]);
}

/** Which councils and which of the three Fathers this reader has read to the end (lib/reader/earned.ts, earnedSoFar). */
export function useEarnedSoFar(): { councils: readonly string[]; fathers: readonly string[] } {
  const ends = useReadToEnd();
  const progress = useReadingProgress();
  return useMemo(() => earnedSoFar(ends, progress), [ends, progress]);
}
