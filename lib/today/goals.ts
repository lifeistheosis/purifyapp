"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * The day's three goals on the Today page: keep the fast, pray the rule,
 * read the appointed Scripture. The most-asked-for idea on the board
 * ("daily goals on the Today page, the fast, the prayer, the reading,
 * with your progress kept on your device").
 *
 * Deliberately humble: today only, three checks, kept on this device.
 * No streak counter, no badges, no history wall, the product is a prayer
 * book, not a productivity tracker (see the identity guardrails). A new
 * day starts fresh; yesterday's marks are not shown or scored.
 *
 * Storage:
 *   purify.today.goals = { date: "YYYY-MM-DD", fast: bool, prayer: bool, reading: bool }
 * The single-day shape means there is nothing to prune and nothing to
 * sync; it is a quiet local intention, reset at midnight local time.
 */

export type GoalKey = "fast" | "prayer" | "reading";

type GoalState = {
  date: string;
  fast: boolean;
  prayer: boolean;
  reading: boolean;
};

const STORAGE_KEY = "purify.today.goals";
const EVENT = "purify:today-goals";

/** Local calendar date as YYYY-MM-DD (matches how the calendar reads the
 * user's own day, not the server clock). */
function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const FRESH = (date: string): GoalState => ({
  date,
  fast: false,
  prayer: false,
  reading: false,
});

function readRaw(): GoalState {
  const today = todayKey();
  if (typeof window === "undefined") return FRESH(today);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return FRESH(today);
    const v = JSON.parse(raw) as Partial<GoalState>;
    // A stored state from an earlier day is stale: start the new day clean.
    if (v.date !== today) return FRESH(today);
    return {
      date: today,
      fast: !!v.fast,
      prayer: !!v.prayer,
      reading: !!v.reading,
    };
  } catch {
    return FRESH(today);
  }
}

function write(state: GoalState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { state } }));
  } catch {
    /* storage unavailable */
  }
}

// Stable snapshot for useSyncExternalStore, cached against the raw string
// AND the current day so a midnight rollover yields a fresh snapshot.
let snapRaw: string | null | undefined;
let snapDay: string | undefined;
let snapVal: GoalState | undefined;

function readSnapshot(): GoalState {
  const today = todayKey();
  if (typeof window === "undefined") return FRESH(today);
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return FRESH(today);
  }
  if (raw === snapRaw && today === snapDay && snapVal) return snapVal;
  snapRaw = raw;
  snapDay = today;
  snapVal = readRaw();
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

const SERVER_SNAPSHOT: GoalState = {
  date: "",
  fast: false,
  prayer: false,
  reading: false,
};

export function useTodayGoals() {
  const state = useSyncExternalStore(
    subscribe,
    readSnapshot,
    () => SERVER_SNAPSHOT,
  );

  const toggle = useCallback((key: GoalKey) => {
    const current = readRaw();
    write({ ...current, [key]: !current[key] });
  }, []);

  const doneCount = state.fast || state.prayer || state.reading
    ? [state.fast, state.prayer, state.reading].filter(Boolean).length
    : 0;

  return { state, toggle, doneCount, total: 3 };
}
