"use client";

import { useMemo } from "react";

import { earnedPalettes, type EarnedPalettes } from "@/lib/reader/earned";
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
