// The sharing half of useLiveData, with no React in it.
//
// WHY IT IS ITS OWN FILE. The hook is four lines of useSyncExternalStore; the
// part worth testing is this: which requests get made, how often, and how many
// of them get collapsed. The unit suite runs in node with no DOM (see
// vitest.config.ts), so as long as this logic lived inside a hook it could only
// be checked by hand in a browser. Split out, it is a plain module that a test
// can drive with fake timers, which is how lib/admin/__tests__/liveStore.test.ts
// pins the deduping down.
//
// ONE TIMER PER URL, NOT PER CALLER. Three components ask for
// /api/admin/overview (the rail at 60s, the activity feed at 30s, the commerce
// tab at 30s), two ask for /api/admin/stats and two for
// /api/admin/traffic?range=90d. Each used to open its own interval, so the
// overview endpoint (which runs service-role counts) was hit three times on
// three unsynchronised schedules for one screen, and two callers could render
// different numbers for the same fact at the same moment. Subscribers now share
// one entry keyed by URL: one timer at the SHORTEST interval any live
// subscriber asked for, one request, one snapshot everybody reads. The fastest
// caller still gets the cadence it asked for and the slower ones get data
// fresher than they asked for, which is never the wrong direction.

import { adminJson } from "./fetchJson";

/** The immutable half of an entry. Replaced, never mutated, so React can diff it. */
export type Snapshot = {
  data: unknown;
  /** When the last SUCCESSFUL read landed. Null until one does. */
  lastSynced: Date | null;
  /** True while nothing has ever succeeded for this URL. */
  loading: boolean;
  /** The last read failed. Any `data` alongside this is the previous good value. */
  failing: boolean;
  /**
   * Consecutive failed reads, reset to 0 by a success. `failing` says the
   * last read did not answer; this says how long that has been true, which
   * is what lets the attention strip tell one dropped poll from a panel that
   * has gone blind.
   */
  misses: number;
};

export const EMPTY_SNAPSHOT: Snapshot = {
  data: null,
  lastSynced: null,
  loading: true,
  failing: false,
  misses: 0,
};

type Entry = {
  snapshot: Snapshot;
  listeners: Set<() => void>;
  /** Each live subscriber's requested interval. The minimum drives the timer. */
  intervals: Map<string, number>;
  timer: ReturnType<typeof setInterval> | null;
  /** A read already on the wire. A second caller awaits it instead of doubling it. */
  inFlight: Promise<void> | null;
  /**
   * When a read last SETTLED, success or failure. Distinct from
   * snapshot.lastSynced, which only advances on success because it is what
   * "40s ago" is printed from and a failed read has synced nothing.
   *
   * The join check needs this one instead. Keying it on lastSynced meant a
   * failing endpoint never looked recent, so every new subscriber fired its
   * own request at it: measured in the shell preview, where /api/admin/stats
   * answers 403, four subscribers produced four requests in one mount burst
   * rather than one. That turns a shared cache into a thundering herd exactly
   * when the endpoint is least able to take it.
   */
  lastAttempt: number;
};

const entries = new Map<string, Entry>();

function entryFor(url: string): Entry {
  let e = entries.get(url);
  if (!e) {
    e = {
      snapshot: EMPTY_SNAPSHOT,
      listeners: new Set(),
      intervals: new Map(),
      timer: null,
      inFlight: null,
      lastAttempt: 0,
    };
    entries.set(url, e);
  }
  return e;
}

/**
 * The current snapshot, without creating an entry.
 *
 * Purity matters here: React calls getSnapshot during render, and building the
 * map entry there would be a render-phase mutation of module state.
 */
export function liveSnapshot(url: string): Snapshot {
  return entries.get(url)?.snapshot ?? EMPTY_SNAPSHOT;
}

function publish(e: Entry, patch: Partial<Snapshot>): void {
  e.snapshot = { ...e.snapshot, ...patch };
  for (const l of e.listeners) l();
}

/** Read now. Concurrent callers share the one request rather than doubling it. */
export function readLive(url: string): Promise<void> {
  const e = entryFor(url);
  // Two components mounting in the same commit both want data now; that is one
  // request, not two.
  if (e.inFlight) return e.inFlight;
  const p = (async () => {
    const d = await adminJson<unknown>(url);
    if (d === null) {
      // Keep the last good value. A dashboard that empties itself because one
      // poll 403'd is worse than one showing numbers from a minute ago next to
      // a note saying so.
      publish(e, { failing: true, loading: false, misses: e.snapshot.misses + 1 });
    } else {
      publish(e, { data: d, lastSynced: new Date(), failing: false, loading: false, misses: 0 });
    }
  })().finally(() => {
    e.inFlight = null;
    e.lastAttempt = Date.now();
  });
  e.inFlight = p;
  return p;
}

/** Retime the shared interval to the fastest live subscriber, or stop it. */
function retime(url: string): void {
  const e = entries.get(url);
  if (!e) return;
  if (e.timer) {
    clearInterval(e.timer);
    e.timer = null;
  }
  if (e.intervals.size === 0) return;
  // document.hidden means nobody is reading it, so the timer stays off until
  // visibility comes back. Guarded for node, where there is no document.
  if (typeof document !== "undefined" && document.hidden) return;
  e.timer = setInterval(() => void readLive(url), Math.min(...e.intervals.values()));
}

// One visibility listener for the whole panel rather than one per hook. When
// the tab comes back, every live URL reads at once and then resumes its
// cadence, so returning shows fresh data instead of waiting out an interval
// that was frozen while nobody was looking.
let visibilityBound = false;
export function bindVisibility(): void {
  if (visibilityBound || typeof document === "undefined") return;
  visibilityBound = true;
  document.addEventListener("visibilitychange", () => {
    for (const [url, e] of entries) {
      if (e.intervals.size === 0) continue;
      // Re-read on return only what has gone STALE by its own interval. A tab
      // focused five seconds after it was left used to re-fetch every live
      // URL, including the ones polled every thirty minutes, so an alt-tab
      // cost the same as a cold load. Measured in the shell preview: eleven
      // requests per focus. The 20-second sources still refresh at once,
      // which is the behaviour this handler exists for.
      if (!document.hidden) {
        const shortest = Math.min(...e.intervals.values());
        const age = e.lastAttempt ? Date.now() - e.lastAttempt : Infinity;
        if (age >= shortest) void readLive(url);
      }
      retime(url);
    }
  });
}

/**
 * Join the readers of `url`, and leave by calling what comes back.
 *
 * `id` distinguishes two subscribers to one URL so they can hold different
 * intervals and be removed independently.
 */
export function subscribeLive(
  url: string,
  intervalMs: number,
  id: string,
  onChange: () => void,
): () => void {
  bindVisibility();
  const e = entryFor(url);
  e.listeners.add(onChange);
  e.intervals.set(id, intervalMs);
  retime(url);
  // Read on join only when what is here is older than this subscriber asked
  // for. A second subscriber to a URL already being polled costs nothing,
  // which is the point; but an entry whose timer stopped when the last
  // subscriber left can be arbitrarily stale, and painting that silently is
  // how a dashboard shows an hour-old number as live.
  const age = e.lastAttempt ? Date.now() - e.lastAttempt : Infinity;
  if (age >= intervalMs) void readLive(url);
  return () => {
    e.listeners.delete(onChange);
    e.intervals.delete(id);
    retime(url);
  };
}

/** How many timers are running. For tests and for reasoning about load. */
export function liveTimerCount(): number {
  let n = 0;
  for (const e of entries.values()) if (e.timer) n++;
  return n;
}

/** Test seam: drop every shared entry so one test's polling cannot reach another's. */
export function resetLive(): void {
  for (const e of entries.values()) if (e.timer) clearInterval(e.timer);
  entries.clear();
}
