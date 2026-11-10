"use client";

// Whether the roads are on (./flags.ts), as a live React value: in step with
// Testers mode starting or ending in this tab (its event) or another (storage).

import { useSyncExternalStore } from "react";

import { roadsBuilt, roadsEnabled } from "./flags";
import { TESTERS_EVENT } from "./testing";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(TESTERS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(TESTERS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** On the server and the first client render: only what the build says, so the markup there is the same. */
export function useRoads(): boolean {
  return useSyncExternalStore(subscribe, roadsEnabled, roadsBuilt);
}
