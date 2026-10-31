"use client";

import { useSyncExternalStore } from "react";

import { isWordsView, type WordsPrefs } from "./media";

/**
 * How a chant's words are shown, the reader's choice: since notes 56 and 59
 * (1.8), the words as sung, their transliteration, or each word over its
 * sound (the switch on the words); and, since 1.7, the English over a line
 * sung in another language (the sheet). Kept on the device and read by a
 * chant's page and by the live captions it starts, so the two agree.
 *
 * The words open as they are sung, the transliteration a tap away, as the
 * owner put it: "there should be Arabic, right? But you should also have the
 * option to switch it". The English is on until the reader turns it off. A
 * choice kept before 1.8's switch (`translit` on or off) is not carried: the
 * switch now sits on the words themselves.
 */
const KEY = "purify:chant.words";
export const WORDS_DEFAULTS: WordsPrefs = { view: "original", en: true };

const listeners = new Set<() => void>();
let cache: { raw: string | null; prefs: WordsPrefs } | null = null;
/** The choice, when storage is shut (a private window): kept for the session. */
let memory: WordsPrefs | null = null;

export function parseWordsPrefs(raw: string | null): WordsPrefs {
  if (!raw) return WORDS_DEFAULTS;
  try {
    const v = JSON.parse(raw) as { view?: unknown; en?: unknown };
    return {
      view: isWordsView(v.view) ? v.view : WORDS_DEFAULTS.view,
      en: typeof v.en === "boolean" ? v.en : WORDS_DEFAULTS.en,
    };
  } catch {
    return WORDS_DEFAULTS;
  }
}

export function wordsPrefs(): WordsPrefs {
  if (typeof window === "undefined") return WORDS_DEFAULTS;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return memory ?? WORDS_DEFAULTS;
  }
  if (cache && cache.raw === raw) return cache.prefs;
  cache = { raw, prefs: parseWordsPrefs(raw) };
  return cache.prefs;
}

export function setWordsPrefs(next: Partial<WordsPrefs>): void {
  const merged = { ...wordsPrefs(), ...next };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    memory = merged;
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useWordsPrefs(): WordsPrefs {
  return useSyncExternalStore(subscribe, wordsPrefs, () => WORDS_DEFAULTS);
}
