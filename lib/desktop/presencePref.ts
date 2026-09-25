"use client";

// The reader's Discord status choice. Kept on this computer only: it
// describes what this desktop app may tell this computer's Discord, so it
// does not follow the account to a phone.
//
// Off unless chosen. What someone reads and prays is theirs to share, and a
// status is seen by everyone on their friends list.

import { useSyncExternalStore } from "react";

import type { PresenceLevel } from "@/lib/desktop/activity";

const KEY = "purify:desktop.presence";
const EVENT = "purify:desktop.presence";

export function readPresenceLevel(): PresenceLevel {
  if (typeof window === "undefined") return "off";
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "app" || v === "reading" ? v : "off";
  } catch {
    return "off";
  }
}

export function writePresenceLevel(level: PresenceLevel): void {
  if (typeof window === "undefined") return;
  try {
    if (level === "off") window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, level);
  } catch {
    /* storage unavailable: the choice lasts until the window closes */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: level }));
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// The server cannot read localStorage, and the default is off.
function serverLevel(): PresenceLevel {
  return "off";
}

/**
 * The current level, kept in step across components and windows. The same
 * useSyncExternalStore shape as the other device-stored toggles (see
 * components/admin/AdminStreamerToggle.tsx), for the same reason: an effect
 * that copies localStorage into state hydrates wrong.
 */
export function usePresenceLevel(): [PresenceLevel, (level: PresenceLevel) => void] {
  const level = useSyncExternalStore(subscribe, readPresenceLevel, serverLevel);
  return [level, writePresenceLevel];
}
