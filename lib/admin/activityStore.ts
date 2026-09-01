// The activity history: what has been announced, kept after it has faded.
//
// WHY A STORE AND NOT COMPONENT STATE. The bar shows an event for a few
// seconds and then drops it, which is right for a bar and wrong for a record.
// An operator who was reading Orders when a sale landed had no way to find out
// it had happened: the row had already gone, and the only other trace was a
// number somewhere that had quietly moved. So the toast is now a VIEW over
// this, not the thing itself, and the bell opens the rest.
//
// Module-level, so it outlives any component. Tab navigation in this panel is
// client-side and remounts the whole content area; anything held in a tab's
// state is gone the moment the operator clicks another rail entry. AdminShell
// keeps the feed mounted, but the store is what makes that survive a remount
// of the feed itself.
//
// PERSISTED, with a deliberate cap and a deliberate age limit. A reload used
// to be an amnesia event. It no longer is, but a log that grows forever in
// localStorage would eventually be the largest thing in it, and an event from
// three days ago is not activity, it is history that the real tables hold
// better. See MAX_KEPT and MAX_AGE_MS.
//
// The pure parts are here and tested; the polling that feeds it lives in
// components/admin/ActivityFeed.tsx and the diffing in lib/admin/activity.ts.

import type { ActivityEvent } from "./activity";

export type ActivityRecord = ActivityEvent & {
  /** Epoch ms when this reached the panel. Shown in the bell, as a time. */
  receivedAt: number;
  /** False until the operator has opened the bell since it arrived. */
  seen: boolean;
};

export const STORE_KEY = "purify.admin.activity";

/** Enough to scroll through, few enough to stay a feed rather than a table. */
export const MAX_KEPT = 40;

/** Older than this is not "activity" any more. 24 hours. */
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Newest first, capped, and stale entries dropped.
 *
 * Pure and exported so the cap and the age limit are testable without a
 * browser, and so both the read path and the write path use exactly one
 * implementation of "what belongs in the store".
 */
export function prune(records: ActivityRecord[], now: number): ActivityRecord[] {
  return records
    .filter((r) => now - r.receivedAt <= MAX_AGE_MS)
    .sort((a, b) => b.receivedAt - a.receivedAt)
    .slice(0, MAX_KEPT);
}

/**
 * Merge fresh events into the history, newest first, without duplicating.
 *
 * Ids from lib/admin/activity.ts carry a sequence number, so two genuinely
 * separate arrivals of the same kind get different ids and both survive. The
 * guard is for React running an effect twice, which StrictMode does in
 * development and which would otherwise double every event in the log.
 */
export function merge(
  existing: ActivityRecord[],
  fresh: ActivityEvent[],
  now: number,
): ActivityRecord[] {
  if (fresh.length === 0) return existing;
  const known = new Set(existing.map((r) => r.id));
  const added = fresh
    .filter((e) => !known.has(e.id))
    .map((e) => ({ ...e, receivedAt: now, seen: false }));
  if (added.length === 0) return existing;
  return prune([...added, ...existing], now);
}

/** How many the operator has not looked at. The bell's badge. */
export function unseenCount(records: ActivityRecord[]): number {
  return records.reduce((n, r) => n + (r.seen ? 0 : 1), 0);
}

/**
 * A short, human time since an event.
 *
 * Deliberately coarse. "3m" is what an operator needs; "3m 14s" is noise that
 * also forces a re-render every second to stay true. Anything under a minute
 * is "now", which is honest at this resolution and never goes stale wrongly.
 */
export function agoLabel(receivedAt: number, now: number): string {
  const s = Math.max(0, Math.round((now - receivedAt) / 1000));
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/** The wall-clock time an event arrived, for the bell's secondary line. */
export function clockLabel(receivedAt: number): string {
  return new Date(receivedAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── The live store ──────────────────────────────────────────────────────────
// useSyncExternalStore shape, matching every other cross-component setting in
// this panel (sound, theme, streamer, motion). An effect that calls setState
// hydrates wrong and is flagged by react-hooks/set-state-in-effect.

let records: ActivityRecord[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function persist() {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(records));
  } catch {
    /* private mode, or quota. The in-memory store still works this session. */
  }
}

/** Read localStorage once per page, lazily, and never on the server. */
function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    // Shape-checked rather than trusted. This is our own data, but it is data
    // from a previous VERSION of this code, and a field that has since been
    // renamed would otherwise render as undefined inside the bell.
    records = prune(
      parsed.filter(
        (r): r is ActivityRecord =>
          !!r &&
          typeof r === "object" &&
          typeof (r as ActivityRecord).id === "string" &&
          typeof (r as ActivityRecord).text === "string" &&
          typeof (r as ActivityRecord).receivedAt === "number",
      ),
      Date.now(),
    );
  } catch {
    records = [];
  }
}

export function getActivity(): ActivityRecord[] {
  load();
  return records;
}

/** The server has no localStorage, and a fresh panel has no history. */
export function getServerActivity(): ActivityRecord[] {
  return EMPTY;
}

// A module-level constant, not a new []. useSyncExternalStore compares
// snapshots by identity and a fresh array every call is an infinite loop.
const EMPTY: ActivityRecord[] = [];

export function subscribeActivity(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** Record newly derived events. Returns the ones that were actually new. */
export function pushActivity(fresh: ActivityEvent[]): ActivityRecord[] {
  load();
  const before = new Set(records.map((r) => r.id));
  const next = merge(records, fresh, Date.now());
  if (next === records) return [];
  records = next;
  persist();
  emit();
  return records.filter((r) => !before.has(r.id));
}

/** The operator opened the bell: everything in it has now been seen. */
export function markAllSeen(): void {
  load();
  if (!records.some((r) => !r.seen)) return;
  records = records.map((r) => (r.seen ? r : { ...r, seen: true }));
  persist();
  emit();
}

export function clearActivity(): void {
  loaded = true;
  records = EMPTY;
  persist();
  emit();
}

/** Test seam: drop the module's memory so cases cannot leak into each other. */
export function __resetActivityStore(): void {
  records = EMPTY;
  loaded = false;
  listeners.clear();
}
