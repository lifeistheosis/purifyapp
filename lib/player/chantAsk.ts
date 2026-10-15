import { useSyncExternalStore } from "react";

/**
 * When a prayer asks "Pray with chant?" (1.7). Once a day at most, only when
 * nothing is playing, and never again once the reader turns the question off
 * in the chant picker. A reader who opens three prayers in a morning is
 * asked at the first.
 */
const OFF_KEY = "purify:chant.ask";
const ASKED_KEY = "purify:chant.asked";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* a private window keeps nothing: the question just comes back */
  }
}

/** The reader's own calendar day, as YYYY-MM-DD. */
export function localDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function askBeforePrayers(): boolean {
  return read(OFF_KEY) !== "off";
}

export function setAskBeforePrayers(on: boolean): void {
  write(OFF_KEY, on ? "on" : "off");
  emit();
}

/** Whether to ask now: the question is on, it has not been asked today, and
 *  nothing is playing already. */
export function shouldAsk(playing: boolean, now: Date = new Date()): boolean {
  if (playing) return false;
  if (!askBeforePrayers()) return false;
  return read(ASKED_KEY) !== localDay(now);
}

/** Asked: not again until tomorrow, whatever the answer. */
export function markAsked(now: Date = new Date()): void {
  write(ASKED_KEY, localDay(now));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The picker's "Ask before my prayers" switch. */
export function useAskBeforePrayers(): boolean {
  return useSyncExternalStore(subscribe, askBeforePrayers, () => true);
}
