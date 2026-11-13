"use client";

// Which on-phone voice the reader has chosen (1.9). Kept on the device, like
// the reader's speed (lib/player/speed.ts); it is a preference, not an
// entitlement: a Plus voice chosen here still has to be answered by the
// server before it can speak (lib/listen/phoneVoices.ts).

import { useSyncExternalStore } from "react";

import { FREE_PHONE_VOICE, phoneVoice } from "./phoneVoices";

const KEY = "purify:phoneVoice.voice";
const listeners = new Set<() => void>();

export function chosenPhoneVoice(): string {
  try {
    const kept = window.localStorage.getItem(KEY);
    return phoneVoice(kept)?.offered ? (kept as string) : FREE_PHONE_VOICE;
  } catch {
    return FREE_PHONE_VOICE;
  }
}

export function choosePhoneVoice(id: string): void {
  if (!phoneVoice(id)?.offered) return;
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* a full or private store: the choice lasts this session */
  }
  for (const l of listeners) l();
}

export function useChosenPhoneVoice(): string {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    chosenPhoneVoice,
    () => FREE_PHONE_VOICE,
  );
}
