"use client";

// Products this device has opened, newest first, for the shop home's
// "Recently viewed" rail. Slugs only, on the device only: the rail re-reads
// the live catalogue for prices and pictures, so a stale snapshot can never
// show an old price, and nothing about browsing leaves the phone.

import { useSyncExternalStore } from "react";

const KEY = "purify:shop.recent";
const EVENT = "purify:recent";
const MAX = 12;

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** Put a slug at the front of the list. */
export function rememberViewed(slug: string): void {
  if (!slug) return;
  try {
    const next = [slug, ...read().filter((s) => s !== slug)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* storage blocked: the rail simply stays empty */
  }
}

let cache: { raw: string; list: string[] } | null = null;
const EMPTY: string[] = [];

function snapshot(): string[] {
  let raw = "[]";
  try {
    raw = window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    /* fall through with the empty list */
  }
  if (!cache || cache.raw !== raw) cache = { raw, list: read() };
  return cache.list;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The list, newest first. Empty on the server and on first paint. */
export function useRecentlyViewed(): string[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
