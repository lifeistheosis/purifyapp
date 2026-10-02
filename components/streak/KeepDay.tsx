"use client";

import { useEffect } from "react";

import { isKept, markKept } from "@/lib/rhythm/marks";

/**
 * Keeps today on the rhythm ledger once the page has been read: `after`
 * seconds with the page in view, counted only while it is visible, so a tab
 * left open in the background keeps nothing. One mark per day per strand.
 *
 * This is what lets a chapter of the Bible, a saint's life, a work of the
 * Fathers or a lesson keep the streak, beside the prayer rules and plan days
 * that marked the ledger already (lib/streak/compute.ts). Renders nothing.
 */
export type KeptStrand = "day:reading" | "day:saint" | "day:teaching" | "day:study";

export function KeepDay({ strand, after = 20 }: { strand: KeptStrand; after?: number }) {
  useEffect(() => {
    if (isKept(strand)) return;
    let seen = 0;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      seen += 1;
      if (seen >= after) {
        window.clearInterval(id);
        markKept(strand);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [strand, after]);
  return null;
}
