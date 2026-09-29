"use client";

// The reader's space (level, intent, fasting rule) as a live React value.
// Re-renders when the answers change in this tab (the onboarding event) or in
// another one (storage), so Settings and Today stay in step.

import { useMemo, useSyncExternalStore } from "react";

import { ONBOARDING_EVENT, parseSpaceSnapshot, spaceSnapshot } from "./state";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(ONBOARDING_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ONBOARDING_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Server and first client render: no answers, fasting as it always showed. */
const SERVER_SNAPSHOT = "||strict";

export function useSpace() {
  const snapshot = useSyncExternalStore(subscribe, spaceSnapshot, () => SERVER_SNAPSHOT);
  return useMemo(() => parseSpaceSnapshot(snapshot), [snapshot]);
}
