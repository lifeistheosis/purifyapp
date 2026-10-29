"use client";

// Whether the Day 1 card is up (components/onboarding/FirstStepsNudge.tsx),
// as one live answer for the card itself and for the streak's rope on Today,
// which waits while it shows (lib/streak/rope.ts, ropeRow). Both read it in
// the same render, so the rope never stands beside the card for a frame.

import { useSyncExternalStore } from "react";

import { ONBOARDING_EVENT, isNudgeDismissed, isNudgeEligible } from "./state";

/** The card is chosen for this reader and not yet taken or dismissed. */
export function isDayOneShown(): boolean {
  return isNudgeEligible() && !isNudgeDismissed();
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ONBOARDING_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ONBOARDING_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** False on the server and the hydration render, so the markup there is the same. */
export function useDayOneShown(): boolean {
  return useSyncExternalStore(subscribe, isDayOneShown, () => false);
}
