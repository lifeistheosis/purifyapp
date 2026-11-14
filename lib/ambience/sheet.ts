"use client";

import { useSyncExternalStore } from "react";

import { warmAmbiencePhotos } from "./warmPhotos";

/**
 * Whether the ambience sheet is open (1.7), and whether it stands over Now
 * Playing. A module store, like lib/player/sheet.ts, so the sound button by
 * the chapter pager, the one in Now Playing, the mini player and the reader's
 * settings all open the one sheet, mounted once in the root frame
 * (components/layout/RootFrame.tsx), Today included.
 */
type State = { open: boolean; overPlayer: boolean };

let state: State = { open: false, overPlayer: false };
/**
 * Whether the sheet is on the screen: from its first frame until the house
 * sheet lets it go, 300ms after it is closed (160 with Purify's motion off),
 * when its close has run. The sheet's own content says so (AmbienceSheet.tsx).
 * Kept out of `state`, so the screens that read `state` draw nothing more.
 */
let drawn = false;
const subscribers = new Set<() => void>();
const subscribe = (cb: () => void) => {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
};

function set(next: State) {
  state = next;
  for (const cb of subscribers) cb();
}

/** `overPlayer`: opened from inside Now Playing, so it stands over it. */
export function openAmbience(opts: { overPlayer?: boolean } = {}): void {
  // Opened before the app was idle: the photographs start decoding now (a no-op once warm).
  void warmAmbiencePhotos();
  set({ open: true, overPlayer: Boolean(opts.overPlayer) });
}

export function closeAmbience(): void {
  if (state.open) set({ ...state, open: false });
}

/** Said by the sheet's content as it is first drawn (true) and as the house sheet lets it go (false). */
export function markAmbienceDrawn(next: boolean): void {
  if (drawn === next) return;
  drawn = next;
  for (const cb of subscribers) cb();
}

/** Closed and still on the screen: the sheet's close is running. */
export function isAmbienceLeaving(): boolean {
  return drawn && !state.open;
}

const SERVER: State = { open: false, overPlayer: false };

export function useAmbienceSheet(): State {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}

/**
 * Whether the sheet's close is running (build 97 note 10, Updates 67). What
 * stands under the sheet reads this with `open` to know when it is uncovered:
 * Now Playing's words woke as the sheet began to close, and their glow,
 * restyled every frame, cost its fall over the Words view 68 frames of 90 on a
 * phone's CPU (scripts/ambience-open-walk.mjs). Only a change of the answer
 * draws: the sheet's first frame, while it is open, changes nothing.
 */
export function useAmbienceLeaving(): boolean {
  return useSyncExternalStore(subscribe, isAmbienceLeaving, () => false);
}
