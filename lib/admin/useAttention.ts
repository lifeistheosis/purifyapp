"use client";

/**
 * The attention strip's data, as one hook the shell calls once.
 *
 * ── What it subscribes to, and at what cost ────────────────────────────
 *
 * Every source goes through liveStore except one, so a second subscriber to
 * a URL is free and a hidden tab pauses everything:
 *
 *   /api/admin/overview            30s   the shell's own poll. This hook asks
 *                                        for 60s, but the activity feed and
 *                                        the Overview tab ask for 30s on the
 *                                        same URL and the store runs one
 *                                        timer at the shortest interval, so
 *                                        30s is the real cadence. The two
 *                                        log reads the route gained are
 *                                        limit-1 on indexed prefixes.
 *   /api/admin/health?scope=internal  5m two RPCs against our own database.
 *                                        The rate limiter is fail-open, so it
 *                                        is worth re-asking.
 *   /api/admin/support?summary=1   10m   one HEAD count.
 *   /api/admin/verification        10m   one small select, its tab's own.
 *   /api/admin/community?summary=1 10m   four HEAD counts.
 *   /api/admin/api-limits?scope=limits 30m the usage counter and one HEAD count.
 *
 * The exception is /api/admin/health?scope=outbound: it carries a live call
 * to API.Bible, a licensed, metered API. It is read ONCE per page load and
 * again only on an explicit Retry, through the small once-store below rather
 * than liveStore, because liveStore re-reads every live URL on every
 * visibility return and a tab focus is not a reason to spend a licensed call.
 *
 * Never read here: /api/admin/shop/reconcile (one Stripe call per pending
 * order), /api/admin/hourly-goals (four HEAD counts per metric, and a slow
 * hour is not a fault), /api/admin/shop/sourcing (housekeeping).
 *
 * ── The reconcile that this browser saw ────────────────────────────────
 *
 * The stale-orders finding clears when a reconcile has run since the newest
 * stale order. The durable record of that is a `shop.reconcile` row in
 * admin_activity_log, which the overview route reads. Until that migration
 * is applied there is no such row, so ReconcileCard also stamps
 * localStorage on a successful Apply and this hook hands that stamp to the
 * derivation. Per browser, like every other preference in this panel, and
 * the derivation is what decides whether it is late enough to count.
 */

import { useCallback, useSyncExternalStore } from "react";

import { adminJson } from "./fetchJson";
import { readLive } from "./liveStore";
import { useLiveData } from "./useLiveData";
import { deriveAttention, SOURCE_URL, type AttentionSummary } from "./attention";
import {
  readApiLimitsSlice,
  readCommunitySlice,
  readOverviewSlice,
  readProbeSlice,
  readSupportSlice,
  readVerificationSlice,
  toSourceState,
} from "./attentionSources";

export const LAST_RECONCILE_KEY = "purify.admin.lastReconcileAt";

/* ── localStorage as an external store, the OverviewWidgets pattern ────── */

const reconcileListeners = new Set<() => void>();

function readLocalReconcileAt(): string | null {
  try {
    return window.localStorage.getItem(LAST_RECONCILE_KEY);
  } catch {
    return null;
  }
}

function subscribeLocalReconcile(fn: () => void): () => void {
  reconcileListeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LAST_RECONCILE_KEY) fn();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    reconcileListeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** Called by ReconcileCard after a successful Apply. */
export function markLocalReconcile(at: string = new Date().toISOString()): void {
  try {
    window.localStorage.setItem(LAST_RECONCILE_KEY, at);
  } catch {
    // Private mode or storage full. The derivation still sees it this session
    // through the listeners below; it just does not survive a reload.
  }
  reconcileListeners.forEach((l) => l());
}

/* ── The outbound probe, read once ────────────────────────────────────── */

type OnceSnapshot = {
  data: unknown;
  loading: boolean;
  failing: boolean;
  lastSynced: Date | null;
};

// One object for the server snapshot AND the initial client snapshot.
// useSyncExternalStore compares them with Object.is after hydration, and two
// equal-looking literals forced a synchronous re-render of the whole shell.
const ONCE_SERVER: OnceSnapshot = { data: null, loading: true, failing: false, lastSynced: null };

const once: {
  snapshot: OnceSnapshot;
  listeners: Set<() => void>;
  inFlight: Promise<void> | null;
  attempted: boolean;
} = {
  snapshot: ONCE_SERVER,
  listeners: new Set(),
  inFlight: null,
  attempted: false,
};

function readOutbound(): Promise<void> {
  if (once.inFlight) return once.inFlight;
  once.attempted = true;
  const p = (async () => {
    const d = await adminJson<unknown>(SOURCE_URL.outbound);
    once.snapshot =
      d === null
        ? { data: null, loading: false, failing: true, lastSynced: null }
        : { data: d, loading: false, failing: false, lastSynced: new Date() };
    once.listeners.forEach((l) => l());
  })().finally(() => {
    once.inFlight = null;
  });
  once.inFlight = p;
  return p;
}

function subscribeOutbound(fn: () => void): () => void {
  once.listeners.add(fn);
  // The first subscriber is what starts the one read. Inside subscribe rather
  // than an effect, for the reason liveStore does the same: an effect that
  // kicks off a state-setting read is the cascading-render shape the lint
  // rule exists to catch, and a store's own subscribe is not a render.
  if (!once.attempted) void readOutbound();
  return () => {
    once.listeners.delete(fn);
    // The last subscriber leaving ends the "once". A shell that unmounts and
    // mounts again (leaving /admin by a link and coming back) is a new page
    // load as far as the operator is concerned, and should not inherit a
    // probe result, or a failure, from before they left.
    if (once.listeners.size === 0) once.attempted = false;
  };
}

/** The outbound probe as HealthTab reads it: the strip's one read, shared. */
export function useOutboundProbe(): OnceSnapshot {
  return useSyncExternalStore(subscribeOutbound, () => once.snapshot, () => ONCE_SERVER);
}

/** Ask the outbound services again. The explicit Retry the header allows. */
export function refreshOutbound(): Promise<void> {
  return readOutbound();
}

/* ── The hook ─────────────────────────────────────────────────────────── */

export type Attention = {
  summary: AttentionSummary;
  /** Re-read one source now. The URL is the item's retryUrl. */
  refresh: (url: string) => void;
};

export function useAttention(): Attention {
  const overview = useLiveData<unknown>(SOURCE_URL.overview, 60_000);
  const internal = useLiveData<unknown>(SOURCE_URL.internal, 300_000);
  const support = useLiveData<unknown>(SOURCE_URL.support, 600_000);
  const verification = useLiveData<unknown>(SOURCE_URL.verification, 600_000);
  const community = useLiveData<unknown>(SOURCE_URL.community, 600_000);
  const apiLimits = useLiveData<unknown>(SOURCE_URL.apiLimits, 1_800_000);
  const outbound = useSyncExternalStore(subscribeOutbound, () => once.snapshot, () => ONCE_SERVER);

  const localReconcileAt = useSyncExternalStore(
    subscribeLocalReconcile,
    readLocalReconcileAt,
    () => null,
  );

  // Derived every render, not memoised. The inputs are seven small payloads
  // and the derivation is a few dozen comparisons; a memo keyed on seven
  // fresh objects would never hit, and one keyed on their fields would be a
  // twenty-eight-entry dependency list that drifts the first time a field is
  // added. Cheap and honest beats cached and stale.
  const summary = deriveAttention({
    overview: toSourceState(overview, readOverviewSlice),
    internal: toSourceState(internal, readProbeSlice),
    outbound: toSourceState(outbound, readProbeSlice),
    support: toSourceState(support, readSupportSlice),
    verification: toSourceState(verification, readVerificationSlice),
    community: toSourceState(community, readCommunitySlice),
    apiLimits: toSourceState(apiLimits, readApiLimitsSlice),
    overviewMisses: overview.misses,
    localReconcileAt,
  });

  const refresh = useCallback((url: string) => {
    if (url === SOURCE_URL.outbound) void readOutbound();
    else void readLive(url);
  }, []);

  return { summary, refresh };
}
