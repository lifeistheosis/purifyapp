"use client";

import { useSyncExternalStore } from "react";

import { fadeOutAmbience } from "@/lib/ambience/player";
import { getAudioSnapshot, pause, setSleep as setTrackSleep, subscribeAudio } from "@/lib/prayers/persistentAudioStore";

/**
 * One sleep timer for everything that plays (1.7): the reading voice or a
 * chant in the app's player, and the ambience under them. Now Playing sets it
 * (Off, 5 to 60 minutes, the end of the track) and the ambience sheet sets
 * the same one (Off, 15, 30, 60), so a reader never has two clocks running
 * that disagree.
 *
 * When it runs out the player pauses and the ambience fades over eight
 * seconds rather than stopping dead: someone falling asleep should not be
 * woken by the silence.
 *
 * "End of the track" stays where the track ends, in persistentAudioStore's
 * ended handler; this module only watches for it, to fade the ambience too.
 * This module imports the player and the ambience; neither imports it, so
 * there is no cycle.
 */
export type SleepChoice = { kind: "off" } | { kind: "minutes"; minutes: number } | { kind: "end" };
export type SleepState = { kind: "off" } | { kind: "minutes"; minutes: number; at: number } | { kind: "end" };

/** How long the ambience takes to go quiet when the timer runs out. */
export const SLEEP_FADE_SECONDS = 8;

let state: SleepState = { kind: "off" };
let timer: ReturnType<typeof setTimeout> | null = null;
let watching: (() => void) | null = null;
const listeners = new Set<() => void>();

function set(next: SleepState) {
  state = next;
  for (const l of listeners) l();
}

function clearClock() {
  if (timer) clearTimeout(timer);
  timer = null;
}

/** The timer ran out: the player pauses and the ambience fades. */
function sleepNow() {
  clearClock();
  pause();
  fadeOutAmbience(SLEEP_FADE_SECONDS);
  set({ kind: "off" });
}

/**
 * While "end of the track" is set, watch the track. It ending (the player
 * stops on its own and forgets the timer, still holding the track) fades the
 * ambience too; the track being put away (the mini player's cross) only
 * ends the timer.
 */
function watchTrackEnd() {
  if (watching) return;
  watching = subscribeAudio(() => {
    const audio = getAudioSnapshot();
    if (state.kind !== "end" || audio.sleep.kind === "end") return;
    stopWatching();
    if (audio.src) fadeOutAmbience(SLEEP_FADE_SECONDS);
    set({ kind: "off" });
  });
}

function stopWatching() {
  watching?.();
  watching = null;
}

export function setSleepTimer(next: SleepChoice, now: number = Date.now()): void {
  clearClock();
  stopWatching();
  if (next.kind === "minutes") {
    const ms = next.minutes * 60_000;
    timer = setTimeout(sleepNow, ms);
    setTrackSleep({ kind: "off" });
    set({ kind: "minutes", minutes: next.minutes, at: now + ms });
    return;
  }
  if (next.kind === "end") {
    setTrackSleep({ kind: "end" });
    set({ kind: "end" });
    watchTrackEnd();
    return;
  }
  setTrackSleep({ kind: "off" });
  set({ kind: "off" });
}

/** Whole minutes left, rounded up, so "Stops in 1 min" holds until it stops. */
export function minutesLeft(s: SleepState, now: number = Date.now()): number {
  if (s.kind !== "minutes") return 0;
  return Math.max(1, Math.ceil((s.at - now) / 60_000));
}

/** Whether a choice is the one set now. */
export function isChosen(s: SleepState, choice: SleepChoice): boolean {
  if (choice.kind === "minutes") return s.kind === "minutes" && s.minutes === choice.minutes;
  return s.kind === choice.kind;
}

/** The timer now, outside React. */
export function getSleepTimer(): SleepState {
  return state;
}

const OFF: SleepState = { kind: "off" };

export function useSleepTimer(): SleepState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => OFF,
  );
}
