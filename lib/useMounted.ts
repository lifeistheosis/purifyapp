"use client";

import { useSyncExternalStore } from "react";

// A store that never changes: subscribing is a no-op and the snapshot is
// simply "am I on the client?". React hydrates with the server snapshot
// (false), then immediately re-renders with the client snapshot (true).
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Returns false during SSR and the hydration render, true from the first
 * client render after mount. Gates localStorage-backed surfaces so the
 * server markup stays deterministic and nothing flashes on hydration —
 * the same job as the old `useState(false)` + `useEffect(setMounted)`
 * pair, without a setState-in-effect.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
}
