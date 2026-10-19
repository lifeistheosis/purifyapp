"use client";

// Every highlighted verse on the device, live, for Saved (lib/saved/feed.ts).
// Read from the per-verse annotations (lib/bible/annotations.ts), the way the
// journal reads its notes (lib/bible/journal.ts); the scan runs again only
// when an annotation has changed, not on every render.

import { useSyncExternalStore } from "react";

import { highlightFrom, type SavedHighlight } from "./feed";

const EMPTY: SavedHighlight[] = [];
let version = 0;
let listening = false;
let cached: { version: number; list: SavedHighlight[] } | null = null;

// Counted from the first read on, whether or not Saved is on screen: a verse
// highlighted in the reader must show the next time Saved opens.
function listen() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  const bump = () => {
    version += 1;
  };
  window.addEventListener("purify:annotation", bump);
  window.addEventListener("storage", bump);
}

function scan(): SavedHighlight[] {
  const out: SavedHighlight[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("purify:bible:")) continue;
      const h = highlightFrom(key, window.localStorage.getItem(key));
      if (h) out.push(h);
    }
  } catch {
    return EMPTY;
  }
  return out;
}

function snapshot(): SavedHighlight[] {
  if (typeof window === "undefined") return EMPTY;
  listen();
  if (!cached || cached.version !== version) cached = { version, list: scan() };
  return cached.list;
}

function subscribe(cb: () => void): () => void {
  listen();
  window.addEventListener("purify:annotation", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("purify:annotation", cb);
    window.removeEventListener("storage", cb);
  };
}

/** Every highlighted verse. Empty on the server and on first paint. */
export function useSavedHighlights(): SavedHighlight[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
