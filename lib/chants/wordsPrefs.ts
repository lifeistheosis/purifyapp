"use client";

import { useSyncExternalStore } from "react";

import type { WordsPrefs } from "./media";

/**
 * What goes under each sung line, the reader's choice (1.7): the
 * transliteration, the English, both, or neither. Kept on the device and read
 * by a chant's page and by the live captions it starts, so the two agree.
 * Both are on until the reader turns one off.
 */
const KEY = "purify:chant.words";
const DEFAULTS: WordsPrefs = { translit: true, en: true };

const listeners = new Set<() => void>();
let cache: { raw: string | null; prefs: WordsPrefs } | null = null;
/** The choice, when storage is shut (a private window): kept for the session. */
let memory: WordsPrefs | null = null;

function parse(raw: string | null): WordsPrefs {
  if (!raw) return DEFAULTS;
  try {
    const v = JSON.parse(raw) as Partial<WordsPrefs>;
    return {
      translit: typeof v.translit === "boolean" ? v.translit : DEFAULTS.translit,
      en: typeof v.en === "boolean" ? v.en : DEFAULTS.en,
    };
  } catch {
    return DEFAULTS;
  }
}

export function wordsPrefs(): WordsPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return memory ?? DEFAULTS;
  }
  if (cache && cache.raw === raw) return cache.prefs;
  cache = { raw, prefs: parse(raw) };
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
  return useSyncExternalStore(subscribe, wordsPrefs, () => DEFAULTS);
}
