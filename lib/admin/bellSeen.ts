"use client";

import { useSyncExternalStore } from "react";

/**
 * When the bell was last opened in this browser: what is newer than this is
 * what its badge counts. Kept like the panel's other per-browser choices
 * (lib/admin/latestDayPreference.ts): localStorage through
 * useSyncExternalStore, null on the server and on first paint, and an
 * in-memory copy where storage is refused.
 *
 * Until it has been opened once, the bell counts from where he last looked
 * at the admin (the timeline's line), not from the beginning of the log.
 */

const KEY = "purify:admin:bell-seen-at";
const EVENT = "purify:admin:bell-seen-at-change";

let memory: string | null = null;

function read(): string | null {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored !== null && Number.isFinite(Date.parse(stored))) return stored;
  } catch {
    // fall through to the in-memory copy
  }
  return memory;
}

export function setBellSeenAt(at: string): void {
  memory = at;
  try {
    window.localStorage.setItem(KEY, at);
  } catch {
    // remembered for this session only
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useBellSeenAt(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
