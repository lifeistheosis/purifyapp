/**
 * Which KPI tiles the operator has pinned to the Summary, and the
 * "Getting started" checklist in the rail. Both are per-operator, both
 * live in localStorage, and both are read through the same
 * useSyncExternalStore idiom the rest of the admin uses for that store
 * (OverviewWidgets.tsx, larp.ts), so a change in one tab reaches another.
 *
 * The pure parts are here and tested; the hooks are at the bottom and
 * only wrap them.
 */

import { useCallback, useSyncExternalStore } from "react";

export const PINS_KEY = "purify.admin.pins";
export const PINS_EVENT = "purify:admin:pins";

/**
 * The owner's default set, in order. Catechism completions is empty until
 * the feature reports a count, and the tile says so rather than hiding.
 */
export const DEFAULT_PINS: readonly string[] = [
  "paid-subscribers",
  "mrr",
  "visitors-30d",
  "new-users-30d",
  "catechism-today",
  "shop-revenue-90d",
];

/** Parse a stored value. Anything malformed is the default set. */
export function parsePins(raw: string | null, known: readonly string[]): string[] {
  if (!raw) return [...DEFAULT_PINS];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [...DEFAULT_PINS];
    const ids = v.filter((x): x is string => typeof x === "string" && known.includes(x));
    return ids;
  } catch {
    return [...DEFAULT_PINS];
  }
}

export function togglePin(pins: readonly string[], id: string): string[] {
  return pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id];
}

function read(): string | null {
  try {
    return window.localStorage.getItem(PINS_KEY);
  } catch {
    return null;
  }
}

function write(pins: readonly string[]): void {
  try {
    window.localStorage.setItem(PINS_KEY, JSON.stringify(pins));
  } catch {
    /* private mode: the pins hold for this page view only */
  }
  window.dispatchEvent(new CustomEvent(PINS_EVENT));
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === PINS_KEY) onChange();
  };
  window.addEventListener(PINS_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PINS_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const SERVER_SNAPSHOT = JSON.stringify(DEFAULT_PINS);

/** The pinned ids, and a toggle. `known` filters out ids that no longer exist. */
export function usePins(known: readonly string[]): [string[], (id: string) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read() ?? SERVER_SNAPSHOT,
    () => SERVER_SNAPSHOT,
  );
  const pins = parsePins(raw, known);
  const toggle = useCallback(
    (id: string) => write(togglePin(parsePins(read() ?? SERVER_SNAPSHOT, known), id)),
    [known],
  );
  return [pins, toggle];
}

/* ── Getting started ──────────────────────────────────────────────────── */

export const STARTED_KEY = "purify.admin.gettingStarted";
export const STARTED_EVENT = "purify:admin:gettingStarted";

/**
 * Five items, hardcoded. docs/DECISIONS.md: the card ships as a stub, it
 * disappears on completion, and its state lives in localStorage. Each item
 * names the tab where the thing gets done.
 */
export const STARTED_ITEMS: readonly { id: string; label: string; tab: string }[] = [
  { id: "goals", label: "Set this month's goals", tab: "goals" },
  { id: "push", label: "Send a push notification", tab: "push" },
  { id: "patch-notes", label: "Publish a patch note", tab: "patch-notes" },
  { id: "shop", label: "Check the shop catalogue", tab: "shop" },
  { id: "health", label: "Run the service probes", tab: "health" },
];

export function parseStarted(raw: string | null): Set<string> {
  if (!raw) return new Set();
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return new Set();
    return new Set(v.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function startedComplete(done: Set<string>): boolean {
  return STARTED_ITEMS.every((i) => done.has(i.id));
}

function readStarted(): string | null {
  try {
    return window.localStorage.getItem(STARTED_KEY);
  } catch {
    return null;
  }
}

function writeStarted(done: Set<string>): void {
  try {
    window.localStorage.setItem(STARTED_KEY, JSON.stringify([...done]));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new CustomEvent(STARTED_EVENT));
}

function subscribeStarted(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STARTED_KEY) onChange();
  };
  window.addEventListener(STARTED_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(STARTED_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useGettingStarted(): [Set<string>, (id: string) => void] {
  const raw = useSyncExternalStore(subscribeStarted, () => readStarted() ?? "", () => "");
  const done = parseStarted(raw || null);
  const toggle = useCallback((id: string) => {
    const next = parseStarted(readStarted());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    writeStarted(next);
  }, []);
  return [done, toggle];
}
