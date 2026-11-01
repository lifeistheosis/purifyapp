"use client";

import { useSyncExternalStore } from "react";

/**
 * How far a reader is in each work (1.7, the reading room's Continue row and
 * a book page's Continue button). The reader writes it as the page scrolls
 * (components/saints/WritingReader.tsx, beside the resume position of
 * lib/reader/position.ts, which keeps its own seven-day life for the silent
 * resume): the section in view, its place among the work's sections, and
 * whether the last one has been reached.
 *
 * Storage, per device, like the reading history (lib/reading/history.ts):
 *   purify:reading-progress = { "<saint>/<work>": { n, i, of, at, done? } }
 * No expiry: a book half read in March is still half read in May. The
 * oldest are let go past CAP.
 */

export type Progress = {
  /** The section's own number (Section.n): the #s anchor. */
  n: number;
  /** Its place among the work's sections, from 0. */
  i: number;
  /** How many sections the work has. */
  of: number;
  /** Date.now() of the reading. */
  at: number;
  /** The last section was reached. */
  done?: true;
};

const STORAGE_KEY = "purify:reading-progress";
const EVENT = "purify:reading-progress";
const CAP = 60;

export type Store = Record<string, Progress>;
const EMPTY: Store = {};

function parse(raw: string | null): Store {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Store) : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** The next store after a reading: pure, so the test can hold it. */
export function withProgress(store: Store, key: string, at: { n: number; i: number; of: number }, now: number): Store {
  if (!Number.isFinite(at.i) || !Number.isFinite(at.of) || at.of < 1 || at.i < 0) return store;
  const done = at.i >= at.of - 1;
  const prev = store[key];
  // A book once finished stays finished when its reader looks back into it.
  const next: Progress = { n: at.n, i: Math.min(at.i, at.of - 1), of: at.of, at: now, ...(done || prev?.done ? { done: true as const } : {}) };
  const entries = Object.entries({ ...store, [key]: next }).sort((a, b) => b[1].at - a[1].at);
  return Object.fromEntries(entries.slice(0, CAP));
}

/**
 * The store after part of a work became a work of its own (1.8,
 * lib/saints/workMoves.ts): a reading in the part that left is the new
 * work's now (the work it left was read through to its end to get there, so
 * that one is finished); a reading in what stayed counts against the
 * shorter work. Pure, for its test; `moveSection` answers a section's new
 * number, or null for one that stayed. Sections run 1, 2, 3 ... in both, so
 * a section's place among them is its number less one.
 */
export function withMovedWork(
  store: Store,
  from: { key: string; of: number },
  to: { key: string; of: number },
  moveSection: (n: number) => number | null,
): Store {
  const prev = store[from.key];
  if (!prev) return store;
  const moved = moveSection(prev.n);
  const next: Store = { ...store };
  if (moved !== null) {
    const done = moved >= to.of || prev.done;
    if (!next[to.key] || next[to.key].at < prev.at) {
      next[to.key] = { n: moved, i: Math.min(moved - 1, to.of - 1), of: to.of, at: prev.at, ...(done ? { done: true as const } : {}) };
    }
    next[from.key] = { n: from.of, i: from.of - 1, of: from.of, at: prev.at, done: true };
    return next;
  }
  if (prev.of === from.of) return store;
  next[from.key] = { ...prev, i: Math.min(prev.i, from.of - 1), of: from.of, ...(prev.i >= from.of - 1 ? { done: true as const } : {}) };
  return next;
}

/** withMovedWork on this device's store; true when it changed. */
export function moveProgress(
  from: { key: string; of: number },
  to: { key: string; of: number },
  moveSection: (n: number) => number | null,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    const before = parse(window.localStorage.getItem(STORAGE_KEY));
    const after = withMovedWork(before, from, to, moveSection);
    if (after === before) return false;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(after));
    window.dispatchEvent(new CustomEvent(EVENT));
    return true;
  } catch {
    return false;
  }
}

export function recordProgress(key: string, at: { n: number; i: number; of: number }) {
  if (typeof window === "undefined") return;
  try {
    const next = withProgress(parse(window.localStorage.getItem(STORAGE_KEY)), key, at, Date.now());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* storage may be unavailable */
  }
}

let snapRaw: string | null | undefined;
let snapVal: Store = EMPTY;

function snapshot(): Store {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  if (raw === snapRaw) return snapVal;
  snapRaw = raw;
  snapVal = parse(raw);
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

/** Every work's progress on this device. The server's answer is none. */
export function useReadingProgress(): Store {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
