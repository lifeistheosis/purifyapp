"use client";

// Whether the Day 1 card is up (components/onboarding/FirstStepsNudge.tsx),
// as one live answer for the card itself and for the streak's rope on Today,
// which waits while it shows (lib/streak/rope.ts, ropeRow). Both read it in
// the same render, so the rope never stands beside the card for a frame.

import { useSyncExternalStore } from "react";

import { roadsEnabled } from "./flags";
import { ONBOARDING_EVENT, isNudgeDismissed, isNudgeEligible } from "./state";
import { TESTERS_EVENT } from "./testing";
import { isWeekStepShown, readRoad } from "./useWeek";

/**
 * The card is chosen for this reader and not yet taken or dismissed. With
 * the roads on (1.9) and a road to walk, the card is today's step of the
 * reader's week (./useWeek.ts) and is up whenever one is waiting.
 */
export function isDayOneShown(): boolean {
  if (roadsEnabled() && readRoad()) return isWeekStepShown();
  return isNudgeEligible() && !isNudgeDismissed();
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ONBOARDING_EVENT, onChange);
  window.addEventListener(TESTERS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ONBOARDING_EVENT, onChange);
    window.removeEventListener(TESTERS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** False on the server and the hydration render, so the markup there is the same. */
export function useDayOneShown(): boolean {
  return useSyncExternalStore(subscribe, isDayOneShown, () => false);
}
