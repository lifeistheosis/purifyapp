"use client";

import { useCallback, useMemo } from "react";
import { useSyncExternalStore } from "react";
import type { FastKind } from "@/lib/calendar/orthodox";
import {
  type CheckinStatus,
  type FastCheckin,
  computeStreak,
  dayKey,
  summarize,
} from "./streak";

/**
 * The fasting tracker's data layer: local-first and offline-safe, the same
 * discipline as lib/florilegium and lib/bookmarks. A single localStorage
 * array read through useSyncExternalStore, mutated through a custom event so
 * every mounted surface (the Today card, the /fasting page) stays in
 * lockstep. Entitlement gating lives at the sync layer, never here, so a
 * reader's marks are never at risk from a billing-state change.
 *
 * Storage:
 *   purify:fastCheckins = FastCheckin[]   // JSON, newest day first
 */

export type { CheckinStatus, FastCheckin } from "./streak";
export { isFastingDay, dayKey, summarize } from "./streak";

const STORAGE_KEY = "purify:fastCheckins";
const EVENT = "purify:fastCheckins";

function uuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readAll(): FastCheckin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FastCheckin[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: FastCheckin[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { items } }));
  } catch {
    /* storage may be unavailable */
  }
}

// Stable snapshot for useSyncExternalStore: cache the parsed array keyed by
// the raw string so reads return the same reference until data changes.
const EMPTY: FastCheckin[] = [];
let snapRaw: string | null | undefined;
let snapVal: FastCheckin[] = EMPTY;

function readSnapshot(): FastCheckin[] {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === snapRaw) return snapVal;
  snapRaw = raw;
  if (!raw) {
    snapVal = EMPTY;
    return snapVal;
  }
  try {
    const parsed = JSON.parse(raw);
    snapVal = Array.isArray(parsed) ? (parsed as FastCheckin[]) : EMPTY;
  } catch {
    snapVal = EMPTY;
  }
  return snapVal;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * Live check-ins plus the mark/clear mutators and the derived streak. All
 * mutators read-modify-write the whole array (a reader's marks are small).
 */
export function useFastCheckins(kindOf: (d: Date) => FastKind, today: Date = new Date()) {
  const list = useSyncExternalStore(subscribe, readSnapshot, () => EMPTY);

  const byDay = useMemo(() => {
    const m = new Map<string, FastCheckin>();
    for (const c of list) if (!m.has(c.day)) m.set(c.day, c);
    return m;
  }, [list]);

  const statusByDay = useMemo(() => {
    const m = new Map<string, CheckinStatus>();
    for (const [day, c] of byDay) m.set(day, c.status);
    return m;
  }, [byDay]);

  // `today` is a Date, so it is a fresh object every render and cannot be a
  // dep directly. Hoisting the day string makes the memo stable within a day
  // AND makes the dep array statically analysable, which the previous inline
  // `dayKey(today)` call was not: it needed an eslint-disable that then hid
  // the whole array from the rules-of-hooks checker.
  const todayKey = dayKey(today);
  const streak = useMemo(
    () => computeStreak(statusByDay, kindOf, today),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `today` is keyed by todayKey
    [statusByDay, kindOf, todayKey],
  );

  const summary = useMemo(() => summarize(list), [list]);

  /** Upsert the mark for a day, keeping the row's id (and server identity) stable. */
  const mark = useCallback(
    (day: string, status: CheckinStatus, fastKind: FastKind, note?: string) => {
      const all = readAll();
      const existing = all.find((c) => c.day === day);
      const entry: FastCheckin = {
        id: existing?.id ?? uuid(),
        day,
        status,
        fastKind,
        note: note?.trim() || undefined,
        updatedAt: Date.now(),
      };
      const rest = all.filter((c) => c.day !== day);
      // newest day first
      writeAll([entry, ...rest].sort((a, b) => (a.day < b.day ? 1 : -1)));
    },
    [],
  );

  /** Remove a day's mark entirely. */
  const clear = useCallback((day: string) => {
    writeAll(readAll().filter((c) => c.day !== day));
  }, []);

  return { list, byDay, statusByDay, streak, summary, mark, clear };
}
