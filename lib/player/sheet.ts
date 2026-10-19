"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether Now Playing is open, and whether it shows the live captions or the
 * picture (1.7). A module store, like the audio itself, so the mini player,
 * the Anthem's page and anything later (the read-aloud) open one sheet.
 *
 * The captions choice is the reader's and is kept on the device: a reader
 * who reads along keeps reading along.
 */
type SheetState = { open: boolean; captions: boolean };

const CAPTIONS_KEY = "purify:player.captions";

function readCaptions(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(CAPTIONS_KEY) === "1";
  } catch {
    return false;
  }
}

let state: SheetState = { open: false, captions: false };
let primed = false;
const subscribers = new Set<() => void>();

function set(patch: Partial<SheetState>) {
  state = { ...state, ...patch };
  for (const cb of subscribers) cb();
}

export function openNowPlaying(opts: { captions?: boolean } = {}): void {
  if (!primed) {
    primed = true;
    state = { ...state, captions: readCaptions() };
  }
  set({ open: true, ...(opts.captions != null ? { captions: opts.captions } : {}) });
}

export function closeNowPlaying(): void {
  set({ open: false });
}

export function setCaptionsOn(on: boolean): void {
  try {
    window.localStorage.setItem(CAPTIONS_KEY, on ? "1" : "0");
  } catch {
    /* private mode: the choice lasts the session */
  }
  set({ captions: on });
}

const SERVER: SheetState = { open: false, captions: false };

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
