import { useSyncExternalStore } from "react";

/**
 * When this device last exchanged the Florilegium with the server, for the
 * sync line on its first page (1.9, the owner's pick for Keeping: "your
 * collections and the sync line on top").
 *
 * Written only when the server has taken the reader's collections or handed
 * them over without an error (lib/sync/florilegium.ts), so the line never
 * says "synced" for an exchange that failed. How many devices share them is
 * known nowhere in the app, so the line does not say it.
 */

const KEY = "purify:florilegium.syncedAt";
const EVENT = "purify:florilegium.synced";

/** The exchange just succeeded. */
export function stampFlorilegiaSynced(now: Date = new Date()): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, now.toISOString());
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENT));
}

function read(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The last successful exchange, as an ISO time, or null: never, or not on this device. */
export function useFlorilegiaSyncedAt(): string | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

// The minute it is, for "Last synced 2 minutes ago", ticking while a page
// shows it. Read from a store, so a render never asks the clock itself.
let minute = 0;
function subscribeMinute(onChange: () => void): () => void {
  const tick = () => {
    const now = Math.floor(Date.now() / 60_000);
    if (now !== minute) {
      minute = now;
      onChange();
    }
  };
  tick();
  const id = window.setInterval(tick, 20_000);
  return () => window.clearInterval(id);
}

/** Minutes since the epoch, or 0 before the page is on the screen. */
export function useMinute(): number {
  return useSyncExternalStore(subscribeMinute, () => minute, () => 0);
}
