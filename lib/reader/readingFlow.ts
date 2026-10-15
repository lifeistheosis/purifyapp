import { useSyncExternalStore } from "react";

/**
 * How a chapter flows (1.7, the owner's "Do all of these" of 2026-10-15):
 * whether the next chapter opens by itself at the end of this one, and
 * whether the verses run as paragraphs. Per device, beside the reader's
 * other preferences (components/reader/ReaderPrefs.tsx), and kept apart from
 * them so that store's snapshot stays as it was.
 */
const KEEP_SCROLLING_KEY = "purify.reader.keepScrolling";
const PARAGRAPHS_KEY = "purify.reader.paragraphs";

export type ReadingFlow = { keepScrolling: boolean; paragraphs: boolean };

const DEFAULT: ReadingFlow = { keepScrolling: true, paragraphs: false };
const listeners = new Set<() => void>();
let cache: { k: string | null; p: string | null; val: ReadingFlow } | null = null;

function read(): ReadingFlow {
  if (typeof window === "undefined") return DEFAULT;
  let k: string | null = null;
  let p: string | null = null;
  try {
    k = window.localStorage.getItem(KEEP_SCROLLING_KEY);
    p = window.localStorage.getItem(PARAGRAPHS_KEY);
  } catch {
    return DEFAULT;
  }
  if (cache && cache.k === k && cache.p === p) return cache.val;
  // On unless turned off; paragraphs off unless turned on.
  const val = { keepScrolling: k !== "0", paragraphs: p === "1" };
  cache = { k, p, val };
  return val;
}

function write(key: string, on: boolean): void {
  try {
    window.localStorage.setItem(key, on ? "1" : "0");
  } catch {
    /* a private window keeps nothing */
  }
  cache = null;
  listeners.forEach((l) => l());
}

export function setKeepScrolling(on: boolean): void {
  write(KEEP_SCROLLING_KEY, on);
}

export function setParagraphs(on: boolean): void {
  write(PARAGRAPHS_KEY, on);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEEP_SCROLLING_KEY || e.key === PARAGRAPHS_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useReadingFlow(): ReadingFlow {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}
