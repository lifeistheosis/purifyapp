"use client";

import { useSyncExternalStore } from "react";
import { isStandalone } from "./detectBrowser";

/**
 * Singleton store for the PWA `beforeinstallprompt` event.
 *
 * The browser dispatches `beforeinstallprompt` at most once per page
 * load, and its `prompt()` may only be called once per captured event.
 * Two components in this app want to consume it:
 *
 *  - `DesktopInstallCTA` on the marketing home (the "Download Purify"
 *    button)
 *  - `InstallPrompt` above the mobile tab bar (the "Install" banner)
 *
 * If each captured the event independently, they would race for the
 * single dispatch and the second listener might never see it. This
 * module centralizes that:
 *
 *  - A module-level `addEventListener` runs once, the moment any
 *    client component imports this file. Hydration timing doesn't
 *    matter because the listener is attached at import time, before
 *    any React effect runs.
 *  - Both consumers `subscribe()` and re-render via `useInstallStore`.
 *  - Only one of them ever calls `consumeInstallEvent()`. The other
 *    is told (atomically) that the event is gone and falls back to
 *    its own no-event UI (modal / banner-dismiss).
 *
 * `appinstalled` is also captured so both consumers can switch to an
 * "installed" state without polling.
 */

export type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let captured: BIPEvent | null = null;
let installedFlag = false;
let listenerInstalled = false;
const subscribers = new Set<() => void>();

function emit() {
  for (const cb of subscribers) {
    try {
      cb();
    } catch {
      /* ignore subscriber errors */
    }
  }
}

/**
 * Attach the window-level listeners exactly once. Safe to call from
 * any module that wants to be sure the store is live; subsequent
 * calls are no-ops.
 */
export function ensureInstallListenerInstalled(): void {
  if (listenerInstalled) return;
  if (typeof window === "undefined") return;
  listenerInstalled = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    // Suppress Chromium's mini-infobar; we render our own affordance.
    e.preventDefault();
    captured = e as BIPEvent;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    captured = null;
    installedFlag = true;
    emit();
  });
}

// Eagerly install the listener at module load so the event isn't lost
// to a slow hydration. Guarded so SSR is a no-op.
if (typeof window !== "undefined") {
  ensureInstallListenerInstalled();
}

/** Current captured event, or null if none / already consumed. */
export function getInstallEvent(): BIPEvent | null {
  return captured;
}

/**
 * True once `appinstalled` has fired in this session, OR the page is
 * already running in standalone display mode (i.e. the user opened
 * the marketing home from inside the installed app). Either way,
 * there's nothing to install.
 */
export function isInstalled(): boolean {
  return installedFlag || isStandalone();
}

/**
 * Atomically read-and-null the captured event. Use this from a click
 * handler that intends to immediately call `.prompt()`. Returns null
 * if another consumer already took it (or it never fired).
 */
export function consumeInstallEvent(): BIPEvent | null {
  if (!captured) return null;
  const e = captured;
  captured = null;
  emit();
  return e;
}

/**
 * React subscription. Returns an unsubscribe function. Used by
 * `useInstallStore`; rarely needed directly.
 */
export function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

/**
 * React hook: returns the current snapshot and re-renders the
 * component when either the captured event or the installed flag
 * changes. `useSyncExternalStore` makes this safe for concurrent
 * rendering and SSR.
 */
type Snapshot = { event: BIPEvent | null; installed: boolean };
let cachedSnap: Snapshot = { event: null, installed: false };

function getSnapshot(): Snapshot {
  // Return a new object only when something actually changed, so the
  // default Object.is equality in `useSyncExternalStore` doesn't
  // trigger spurious re-renders.
  if (
    cachedSnap.event !== captured ||
    cachedSnap.installed !== installedFlag
  ) {
    cachedSnap = { event: captured, installed: installedFlag };
  }
  return cachedSnap;
}

function getServerSnapshot(): Snapshot {
  // SSR: no event, not installed. The same object identity for every
  // call avoids hydration mismatches.
  return SERVER_SNAP;
}
const SERVER_SNAP: Snapshot = { event: null, installed: false };

export function useInstallStore(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
