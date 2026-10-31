"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the window is wide enough for the shop's pages to stand side by
 * side (r3-19 at the website's width: the orders beside the open order, the
 * inbox and the order beside a thread). False on the server and on a phone,
 * so those only ever read what the phone's single column shows.
 */
const WIDE = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useWide(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}
