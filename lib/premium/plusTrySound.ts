"use client";

// The sound a Plus preview plays (r3-07 A): Ambience, John 1 with Rain for a
// minute, then it stops (lib/premium/plusTry.ts). One session at a time, held
// here and not in the preview, so whatever closes it (Back, Next, the sheet's
// close, a link out, the screen going away) stops the sound, even before the
// preview's own code has loaded.
//
// It plays through the app's one ambience player (lib/ambience/player.ts),
// which is how a minute of it is the real thing. It never touches what a
// reader is entitled to: the player has no gate of its own, the ambience
// sheet keeps its lock, and a preview ends by itself after the minute.
//
// A subscriber who already had a sound on gets it back when the preview
// ends; anyone else hears silence again.

import { useSyncExternalStore } from "react";

import type { AmbienceId } from "@/lib/ambience/ambience";
import { fadeOutAmbience, getAmbiencePlaying, playAmbience } from "@/lib/ambience/player";
import { TRY_MINUTE_MS, trySoundOf } from "@/lib/premium/plusTry";

/** How long the sound takes to go when the minute is up. */
const FADE_AT_END = 1.6;
/** How long it takes to go when the reader leaves the preview. */
const FADE_ON_LEAVE = 0.6;

export type TrySoundState = {
  /** The preview playing, by its row's id, or null. */
  feature: string | null;
  /** When its minute began (Date.now()), for the bar that shows it passing. */
  startedAt: number;
  /** The minute is up: the sound has gone and the lock's words stand. */
  ended: boolean;
};

const IDLE: TrySoundState = { feature: null, startedAt: 0, ended: false };

let state: TrySoundState = IDLE;
let timer: ReturnType<typeof setTimeout> | null = null;
/** What was playing before the preview began, to give back when it ends. */
let before: AmbienceId | null = null;
const listeners = new Set<() => void>();

function set(next: TrySoundState) {
  state = next;
  for (const l of listeners) l();
}

function clearTimer() {
  if (timer !== null) clearTimeout(timer);
  timer = null;
}

/**
 * Begin a feature's preview. Call it from the tap itself (Try it, Next):
 * phones start a sound only from one. A page's preview stops any sound a
 * preview was playing.
 */
export function beginTry(feature: string): void {
  const sound = trySoundOf(feature);
  if (!sound) {
    endTrySound();
    return;
  }
  if (state.feature === null) before = getAmbiencePlaying();
  clearTimer();
  void playAmbience(sound);
  set({ feature, startedAt: Date.now(), ended: false });
  timer = setTimeout(() => {
    timer = null;
    fadeOutAmbience(FADE_AT_END);
    set({ ...state, ended: true });
  }, TRY_MINUTE_MS);
}

/** Choose another sound inside the preview's minute (the tiles under the page). */
export function trySound(sound: AmbienceId | null): void {
  if (state.feature === null || state.ended) return;
  void playAmbience(sound);
}

/** Stop the preview's sound now: the reader left it. What was playing before comes back. */
export function endTrySound(): void {
  if (state.feature === null) return;
  clearTimer();
  const back = before;
  before = null;
  if (!state.ended) fadeOutAmbience(FADE_ON_LEAVE);
  set(IDLE);
  if (back) void playAmbience(back);
}

export function trySoundState(): TrySoundState {
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTrySound(): TrySoundState {
  return useSyncExternalStore(subscribe, () => state, () => IDLE);
}
