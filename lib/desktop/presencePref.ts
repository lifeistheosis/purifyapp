"use client";

// The reader's Discord status choices. Kept on this computer only: they
// describe what this desktop app may tell this computer's Discord, so they
// do not follow the account to a phone.
//
// Off unless chosen. What someone reads and prays is theirs to share, and a
// status is seen by everyone on their friends list.
//
// Until 26 September 2026 this was one word under purify:desktop.presence:
// "app" or "reading". "reading" carries over as the Reading mode. "app" ("In
// Purify" and nothing more) has no equivalent among the four modes, so it
// carries over as off rather than as a mode that says more than was chosen.

import { useSyncExternalStore } from "react";

import { DEFAULT_PREFS, parsePrefs, type PresencePrefs } from "@/lib/desktop/presenceModes";

const KEY = "purify:desktop.presence.v2";
const LEGACY_KEY = "purify:desktop.presence";
const EVENT = "purify:desktop.presence";

let lastRaw: string | null | undefined;
let lastPrefs: PresencePrefs = DEFAULT_PREFS;

function readRaw(): string | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw !== null) return raw;
    return window.localStorage.getItem(LEGACY_KEY) === "reading" ? JSON.stringify({ mode: "reading" }) : null;
  } catch {
    return null;
  }
}

/** Stable between changes, as useSyncExternalStore requires. */
export function readPresencePrefs(): PresencePrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  const raw = readRaw();
  if (raw === lastRaw) return lastPrefs;
  lastRaw = raw;
  try {
    lastPrefs = raw ? parsePrefs(JSON.parse(raw)) : DEFAULT_PREFS;
  } catch {
    lastPrefs = DEFAULT_PREFS;
  }
  return lastPrefs;
}

export function writePresencePrefs(next: PresencePrefs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* storage unavailable: the choice lasts until the window closes */
    lastRaw = JSON.stringify(next);
    lastPrefs = next;
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === LEGACY_KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// The server cannot read localStorage, and the default is off.
function serverPrefs(): PresencePrefs {
  return DEFAULT_PREFS;
}

/**
 * The current choices, kept in step across components and windows. The same
 * useSyncExternalStore shape as the other device-stored toggles (see
 * components/admin/AdminStreamerToggle.tsx), for the same reason: an effect
 * that copies localStorage into state hydrates wrong.
 */
export function usePresencePrefs(): [PresencePrefs, (patch: Partial<PresencePrefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, readPresencePrefs, serverPrefs);
  return [prefs, (patch) => writePresencePrefs({ ...readPresencePrefs(), ...patch })];
}
