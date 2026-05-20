"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * App-wide Interlinear toggle. When ON, the chapter reader shows the
 * original Greek alongside the English.
 *
 * Stored as a single boolean in localStorage so the choice persists across
 * chapters and reloads. All consumers share one source of truth via
 * useSyncExternalStore, so multiple instances on the same page stay in sync
 * without per-instance effect setState.
 */

const KEY = "purify:interlinear";
const EVT = "purify:interlinear:change";

function read(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useInterlinear() {
  const on = useSyncExternalStore(subscribe, read, () => false);

  const toggle = useCallback(() => {
    const next = !read();
    try {
      if (next) window.localStorage.setItem(KEY, "1");
      else window.localStorage.removeItem(KEY);
    } catch {
      /* storage may be unavailable */
    }
    window.dispatchEvent(new CustomEvent(EVT, { detail: { on: next } }));
  }, []);

  return { on, toggle };
}
