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
// ON RATE LIMITS. RevenueCat's metrics endpoint allows 25 requests a minute
// and lib/billing/revenuecatMetrics.ts caches for 60 seconds, so a 60s poll
// costs at most one upstream call per minute no matter how many tabs are
// open. Polling faster than that server cache would only re-serve the same
// bytes, which is why 60s is the floor for anything reading a metered vendor.

import { useCallback, useEffect, useState } from "react";
import { adminJson } from "./fetchJson";

export type LiveData<T> = {
  data: T | null;
  /** When the last SUCCESSFUL read landed. Null until one does. */
  lastSynced: Date | null;
  /** True while a request is in flight and nothing has ever succeeded. */
  loading: boolean;
  /** The last read failed. Any `data` alongside this is the previous good value. */
  failing: boolean;
  /** Force a read now, e.g. from a Refresh control. */
  refresh: () => void;
};

export function useLiveData<T>(url: string, intervalMs: number): LiveData<T> {
  const [data, setData] = useState<T | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [failing, setFailing] = useState(false);

  // A nonce in state, not a ref. A ref cannot be a dependency: it does not
  // trigger a render and the effect would not reliably see the new value, so
  // Refresh would work only when something else happened to re-render.
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const read = async () => {
      const d = await adminJson<T>(url);
      if (!alive) return;
      if (d === null) {
        setFailing(true);
      } else {
        setData(d);
        setLastSynced(new Date());
        setFailing(false);
      }
      setLoading(false);
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(read, intervalMs);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        // Read first, then resume the cadence. Waiting out the interval on
        // return is what makes a "live" panel show a stale number to the one
        // person who just came back to look at it.
        void read();
        start();
      }
    };

    void read();
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [url, intervalMs, nonce]);

  return { data, lastSynced, loading, failing, refresh };
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
