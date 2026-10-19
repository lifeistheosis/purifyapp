"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the ambience sheet is open (1.7), and whether it stands over Now
 * Playing. A module store, like lib/player/sheet.ts, so the sound button by
 * the chapter pager, the one in Now Playing, the mini player and the reader's
 * settings all open the one sheet, mounted once in the root frame
 * (components/layout/RootFrame.tsx), Today included.
 */
type State = { open: boolean; overPlayer: boolean };

let state: State = { open: false, overPlayer: false };
const subscribers = new Set<() => void>();

function set(next: State) {
  state = next;
  for (const cb of subscribers) cb();
}

/** `overPlayer`: opened from inside Now Playing, so it stands over it. */
export function openAmbience(opts: { overPlayer?: boolean } = {}): void {
  set({ open: true, overPlayer: Boolean(opts.overPlayer) });
}

export function closeAmbience(): void {
  if (state.open) set({ ...state, open: false });
}

const SERVER: State = { open: false, overPlayer: false };

export function useAmbienceSheet(): State {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    () => state,
    () => SERVER,
  );
}
