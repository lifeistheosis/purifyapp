"use client";

// One way to keep an admin panel live, so every panel behaves the same and
// none of them burns quota nobody is looking at.
//
// WHAT WAS WRONG WITH THE THREE POLLERS THIS REPLACES. LiveTab polls every 5
// seconds, OverviewTab every 10 across three endpoints, CommerceOverviewTab
// every 30. All three poll blindly: a tab left open in a background window
// overnight keeps hitting service-role endpoints all night at full rate, and
// nobody sees a single frame of it. RevenueTab had the opposite problem and
// fetched exactly once, so the number on screen could be hours old with
// nothing saying so.
//
// Three things this does that a bare setInterval does not:
//
//   PAUSES WHEN HIDDEN. document.hidden means nobody is reading it. The timer
//   stops, and a fetch fires immediately on return rather than waiting out
//   the remainder of an interval, so coming back to the tab shows fresh data
//   at once instead of stale data for another 30 seconds.
//
//   REPORTS ITS OWN FRESHNESS. Every panel can say when it last synced, which
//   is the difference between a number and a number you can trust. A live
//   feed that cannot say how live it is has the same problem as an estimate
//   that does not say it is estimated.
//
//   KEEPS THE LAST GOOD VALUE. adminJson returns null on a failure, and this
//   holds the previous data rather than blanking. A dashboard that empties
//   itself because one poll 403'd is worse than one showing numbers from a
//   minute ago next to a note saying so.
//
//   SHARES ONE TIMER PER URL. Seven of the panel's live subscriptions point at
//   three endpoints, so most of them are duplicates of each other. All of that
//   lives in ./liveStore, which this hook is now a thin React binding over;
//   read that file for the deduping rules and their reasons.
//
// ON RATE LIMITS. RevenueCat's metrics endpoint allows 25 requests a minute
// and lib/billing/revenuecatMetrics.ts caches for 60 seconds, so a 60s poll
// costs at most one upstream call per minute no matter how many tabs are
// open. Polling faster than that server cache would only re-serve the same
// bytes, which is why 60s is the floor for anything reading a metered vendor.

import { useCallback, useId, useSyncExternalStore } from "react";
import {
  EMPTY_SNAPSHOT,
  liveSnapshot,
  readLive,
  subscribeLive,
} from "./liveStore";

export type LiveData<T> = {
  data: T | null;
  /** When the last SUCCESSFUL read landed. Null until one does. */
  lastSynced: Date | null;
  /** True while a request is in flight and nothing has ever succeeded. */
  loading: boolean;
  /** The last read failed. Any `data` alongside this is the previous good value. */
  failing: boolean;
  /** Consecutive failed reads, 0 after any success. See liveStore.ts. */
  misses: number;
  /** Force a read now, e.g. from a Refresh control. */
  refresh: () => void;
};

export function useLiveData<T>(url: string, intervalMs: number): LiveData<T> {
  // useId, not a module counter behind useMemo. useMemo is a performance hint
  // React is allowed to discard and recompute, which would hand this hook a
  // second identity and orphan its interval entry in the store.
  const id = useId();

  const subscribe = useCallback(
    (onChange: () => void) => subscribeLive(url, intervalMs, id, onChange),
    [url, intervalMs, id],
  );

  const snap = useSyncExternalStore(
    subscribe,
    () => liveSnapshot(url),
    () => EMPTY_SNAPSHOT,
  );

  const refresh = useCallback(() => void readLive(url), [url]);

  return {
    data: snap.data as T | null,
    lastSynced: snap.lastSynced,
    loading: snap.loading,
    failing: snap.failing,
    misses: snap.misses,
    refresh,
  };
}

/** "just now", "40s ago", "3m ago". Deliberately coarse: a live panel needs the order of magnitude, not the second. */
export function agoLabel(d: Date | null, now: number = Date.now()): string {
  if (!d) return "never";
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}
