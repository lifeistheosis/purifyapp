"use client";

// Which prayers carry "Those I pray for" (lib/prayers/commemoration.ts), as the
// reader chose, kept on this device. Every read is guarded (private mode,
// blocked storage) and every write tells the page.

import { useSyncExternalStore } from "react";

import { DEFAULT_PLACES, PLACES_EVENT, PLACES_KEY, cleanPlaces, parsePlacesSetting, type PrayPlace } from "./commemoration";

const SERVER: PrayPlace[] = [...DEFAULT_PLACES];
let cache: { raw: string | null; places: PrayPlace[] } | null = null;

/** The choice as kept, the same array until it changes. */
export function readRememberedPlaces(): PrayPlace[] {
  if (typeof window === "undefined") return SERVER;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(PLACES_KEY);
  } catch {
    return SERVER;
  }
  if (cache && cache.raw === raw) return cache.places;
  const places = parsePlacesSetting(raw);
  cache = { raw, places };
  return places;
}

export function writeRememberedPlaces(places: readonly PrayPlace[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PLACES_KEY, JSON.stringify({ v: 1, places: cleanPlaces([...places]) ?? [] }));
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent(PLACES_EVENT));
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(PLACES_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(PLACES_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The choice, live: the defaults on the server and before the page has hydrated. */
export function useRememberedPlaces(): PrayPlace[] {
  return useSyncExternalStore(subscribe, readRememberedPlaces, () => SERVER);
}
