"use client";

import { useSyncExternalStore } from "react";

import { parseLatestDay, type LatestDay } from "./dayWindow";

/**
 * The Traffic tab's "latest day" choice, remembered per browser.
 *
 * "now" ends the daily charts on today, still running. "complete" ends them on
 * yesterday, so every point is a finished day. The meaning lives in
 * lib/admin/dayWindow.ts; this only remembers which one the operator picked.
 *
 * Same useSyncExternalStore shape as streamer mode (lib/admin/streamer.ts), for
 * the same reason: the value lives in localStorage, which an effect calling
 * setState hydrates wrong, and a second admin window should follow along.
 *
 * localStorage can throw rather than return null (private windows, blocked
 * site data), so every touch is guarded and an in-memory copy stands in. The
 * toggle keeps working for the session even where it cannot be remembered.
 */

const KEY = "purify:admin:traffic-latest-day";
const EVENT = "purify:admin:traffic-latest-day-change";

let memory: LatestDay = "now";

function read(): LatestDay {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored !== null) return parseLatestDay(stored);
  } catch {
    // fall through to the in-memory copy
  }
  return memory;
}

export function setLatestDay(next: LatestDay): void {
  memory = next;
  try {
    window.localStorage.setItem(KEY, next);
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

/** The current choice. "now" on the server and on first paint. */
export function useLatestDay(): LatestDay {
  return useSyncExternalStore(subscribe, read, () => "now");
}
