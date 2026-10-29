"use client";

// Whether this device is in Testers mode (./testing.ts), as a live React
// value: in step with a switch in this tab (its event) or another (storage).

import { useSyncExternalStore } from "react";

import { TESTERS_EVENT, isTesting } from "./testing";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(TESTERS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(TESTERS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** False on the server and the first client render: no test is drawn before the device is read. */
export function useTesting(): boolean {
  return useSyncExternalStore(subscribe, isTesting, () => false);
}
