"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether Now Playing is open, and which of its two views it shows (1.8, the
 * owner's pick of 2026-10-27, round 8: "Keep the two separate, as in John 1
 * without the lyrics and John 1 with the lyrics"): the cover, the playing
 * item's picture large with no words, or the words, lit as they are sung or
 * read, with no picture but a small one at their head. A switch in the top
 * bar moves between them; they are never drawn together. A module store,
 * like the audio itself, so the mini player, a chant's page and the
 * read-aloud open one sheet.
 *
 * The view is the reader's choice and is kept on the device: a reader who
 * reads along keeps reading along. It keeps 1.7's key, where "1" meant the
 * live captions were on, so a reader who had them on opens on the words.
 */
export type PlayerView = "cover" | "words";
type SheetState = { open: boolean; view: PlayerView };

const VIEW_KEY = "purify:player.captions";

function readView(): PlayerView {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(VIEW_KEY) === "1" ? "words" : "cover";
  } catch {
    return "cover";
  }
}

let state: SheetState = { open: false, view: "cover" };
let primed = false;
const subscribers = new Set<() => void>();

function set(patch: Partial<SheetState>) {
  state = { ...state, ...patch };
  for (const cb of subscribers) cb();
}

/** Open Now Playing on the view the reader last chose, or on `view` this once. */
export function openNowPlaying(opts: { view?: PlayerView } = {}): void {
  if (!primed) {
    primed = true;
    state = { ...state, view: readView() };
  }
  set({ open: true, ...(opts.view ? { view: opts.view } : {}) });
}

export function closeNowPlaying(): void {
  set({ open: false });
}

/** The reader's choice of view, remembered on the device. */
export function setPlayerView(view: PlayerView): void {
  primed = true;
  try {
    window.localStorage.setItem(VIEW_KEY, view === "words" ? "1" : "0");
  } catch {
    /* private mode: the choice lasts the session */
  }
  set({ view });
}

/** The sheet outside React: open, and on which view. */
export function getNowPlaying(): SheetState {
  return state;
}

const SERVER: SheetState = { open: false, view: "cover" };

export function useNowPlayingSheet(): SheetState {
  return useSyncExternalStore(
    (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    () => state,
    () => SERVER,
  );
}
