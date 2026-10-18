"use client";

// The names from the prayer wall, kept on this device (lib/prayers/wallNames.ts
// is the model). Every read is guarded (private mode, blocked storage), every
// write tells the page through WALL_EVENT, and the prayer sync bridge carries
// the list to the reader's own account when they are signed in.

import { useSyncExternalStore } from "react";

import { WALL_EVENT, WALL_KEY, parseWallNames, type WallName } from "./wallNames";

const EMPTY: WallName[] = [];
let cache: { raw: string | null; list: WallName[] } | null = null;

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(WALL_KEY);
  } catch {
    return null;
  }
}

/** The list as kept, the same array until it changes (so a store can compare it). */
export function readWallNames(): WallName[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = readRaw();
  if (cache && cache.raw === raw) return cache.list;
  const list = parseWallNames(raw);
  cache = { raw, list };
  return list;
}

export function writeWallNames(list: readonly WallName[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WALL_KEY, JSON.stringify(list));
  } catch {
    // Quota or private mode: the list stays as it was.
    return;
  }
  window.dispatchEvent(new CustomEvent(WALL_EVENT));
}

/** Read the list fresh, change it, keep it. Answers the list as kept. */
export function updateWallNames(change: (list: WallName[]) => WallName[]): WallName[] {
  const next = change(readWallNames());
  writeWallNames(next);
  return next;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(WALL_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(WALL_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The list, live: nothing on the server and before the page has hydrated. */
export function useWallNames(): WallName[] {
  return useSyncExternalStore(subscribe, readWallNames, () => EMPTY);
}
