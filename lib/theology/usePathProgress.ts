"use client";

// The reader's place on Theology's path (1.8, round 3 r3-13), kept on the
// device under purify:theology:path, as the reading paths keep theirs
// (lib/reading/pathProgress.ts): no account needed. A live React value, as
// the reader's space is (lib/onboarding/useSpace.ts): it changes in this tab
// by an event of its own, and in another by `storage`.

import { useMemo, useSyncExternalStore } from "react";

import { parseProgress, type PathProgress } from "./path";

export const PATH_KEY = "purify:theology:path";
export const PATH_EVENT = "purify:theology-path";

function snapshot(): string {
  try {
    return window.localStorage.getItem(PATH_KEY) ?? "";
  } catch {
    return "";
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(PATH_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PATH_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The server, and the first render on the device, have nothing kept: no progress. */
export function usePathProgress(): PathProgress {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  return useMemo(() => parseProgress(raw), [raw]);
}

/** Change the kept progress (lib/theology/path.ts, withRead and the rest). */
export function updatePathProgress(change: (now: PathProgress) => PathProgress): void {
  const now = parseProgress(snapshot());
  const next = change(now);
  if (next === now) return;
  try {
    window.localStorage.setItem(PATH_KEY, JSON.stringify(next));
  } catch {
    /* a private window: the path just will not remember */
  }
  window.dispatchEvent(new Event(PATH_EVENT));
}
