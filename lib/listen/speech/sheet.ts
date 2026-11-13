"use client";

import { useSyncExternalStore } from "react";

/**
 * The Voice sheet's state (1.9, build 95 note 25): opened from the player's
 * ••• (over the player), or from a page's Listen when the phone has no voice
 * for the text's language and the text has no recording (`none`), to say so
 * and where a voice is added. Mounted once in the root frame, as the ambience
 * sheet is (components/player/VoiceSheet.tsx).
 */

export type VoiceSheetState = { open: boolean; overPlayer: boolean; none: { lang: string } | null };

let state: VoiceSheetState = { open: false, overPlayer: false, none: null };
const listeners = new Set<() => void>();

function set(next: VoiceSheetState): void {
  state = next;
  for (const l of listeners) l();
}

export function openVoiceSheet(o: { overPlayer?: boolean; none?: { lang: string } } = {}): void {
  set({ open: true, overPlayer: Boolean(o.overPlayer), none: o.none ?? null });
}

export function closeVoiceSheet(): void {
  if (state.open) set({ ...state, open: false });
}

export function useVoiceSheet(): VoiceSheetState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => state,
    () => state,
  );
}
