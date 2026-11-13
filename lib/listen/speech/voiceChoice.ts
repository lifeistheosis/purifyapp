"use client";

import { useSyncExternalStore } from "react";

import { speaksLanguage, type PhoneVoice } from "./engine";

/**
 * Which voice reads to the reader (1.9, build 95 note 25), kept on the device
 * as the reader's speed is (lib/player/speed.ts), one choice for each
 * language, since a reader of the King James and of the Synodal needs a voice
 * for each. "heart" is the recorded voice, where a text has its recording;
 * anything else is one of the phone's voices, by the phone's own id.
 *
 * Free for every reader (his "all recs" of 2026-11-13): the phone's voices
 * cost nothing to serve, and the paywall already says listening to every
 * chapter read aloud stays free.
 */

export const HEART = "heart";
const KEY = "purify:listen.voice";
const SAID = "purify:listen.voiceGone";
const listeners = new Set<() => void>();
let cache: Record<string, string> | null = null;

function base(lang: string): string {
  return lang.toLowerCase().split(/[-_]/)[0];
}

function all(): Record<string, string> {
  if (cache) return cache;
  try {
    const kept = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    cache = kept && typeof kept === "object" ? (kept as Record<string, string>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

/** The reader's choice for a language, or null where they have chosen none. */
export function chosenVoice(lang: string): string | null {
  return all()[base(lang)] ?? null;
}

export function chooseVoice(lang: string, id: string): void {
  cache = { ...all(), [base(lang)]: id };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* a full or private store: the choice lasts this session */
  }
  for (const l of listeners) l();
}

export function useChosenVoice(lang: string): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => chosenVoice(lang),
    () => null,
  );
}

export type VoiceToUse =
  | { kind: "heart"; gone?: string }
  | { kind: "phone"; voice: PhoneVoice; gone?: string }
  /** The phone has no voice for the text's language and there is no recording. */
  | { kind: "none" };

/** The phone's voices for a language, its own first, then its better ones, then by name. */
export function voicesFor(voices: readonly PhoneVoice[], lang: string): PhoneVoice[] {
  return voices
    .filter((v) => speaksLanguage(v, lang))
    .sort((a, b) => Number(Boolean(b.default)) - Number(Boolean(a.default)) || (b.quality ?? 0) - (a.quality ?? 0) || a.name.localeCompare(b.name));
}

/**
 * Which voice reads a text: the reader's choice where it can, else Heart where
 * the text has its recording, else the phone's own voice for the language. A
 * chosen phone voice the phone no longer has falls back the same way, and
 * says which one has gone (`gone`), for the player to say so once.
 */
export function voiceToUse(choice: string | null, voices: readonly PhoneVoice[], lang: string, recorded: boolean): VoiceToUse {
  const mine = voicesFor(voices, lang);
  const fallback = (gone?: string): VoiceToUse =>
    recorded ? { kind: "heart", ...(gone ? { gone } : {}) } : mine[0] ? { kind: "phone", voice: mine[0], ...(gone ? { gone } : {}) } : { kind: "none" };
  if (!choice) return fallback();
  if (choice === HEART) return recorded ? { kind: "heart" } : fallback();
  const found = mine.find((v) => v.id === choice);
  return found ? { kind: "phone", voice: found } : fallback(choice);
}

/** Whether the player has already said that this voice has gone: it says so once. */
export function goneSaid(id: string): boolean {
  try {
    return (window.localStorage.getItem(SAID) ?? "").split("\n").includes(id);
  } catch {
    return false;
  }
}

export function markGoneSaid(id: string): void {
  try {
    const said = (window.localStorage.getItem(SAID) ?? "").split("\n").filter(Boolean);
    window.localStorage.setItem(SAID, [...said.filter((x) => x !== id), id].slice(-20).join("\n"));
  } catch {
    /* said once this session, then */
  }
}

/** For tests. */
export function forgetVoiceChoices(): void {
  cache = null;
}
