"use client";

import { useSyncExternalStore } from "react";

/**
 * A chapter's reading asked for on the page about to open (1.7, 1.9): a
 * reading that ended rolls on into the next chapter, and the player's previous
 * and next step to a chapter the phone's voice reads, which needs that page's
 * own words. The page reads the ask as it opens (components/bible/ReadAloud.tsx,
 * ReadAloudFollow) and begins.
 */
const NEXT_KEY = "purify:readAloud.next";

/**
 * The chapter whose reading is on its way (build 98, the dock's "1x" jump):
 * from the ask until the page's reading has begun, or could not. The page
 * opens first and its reading begins a moment after (ReadAloudFollow takes
 * the ask once the page is drawn, and the voice is found before anything
 * plays), and in that moment the player still held the chapter that ended.
 * The dock arriving on the next chapter read it as a chapter not loaded and
 * offered Listen, then Speed once the reading came: the button jumped 52px
 * about a second after a tab switch, as the ended chapter rolled on
 * (Updates 98a; measured by Updates 98g, Listen for 54ms on John 11). The
 * pill reads this mark, so the dock offers Speed from its first frame.
 */
let coming: string | null = null;
const listeners = new Set<() => void>();
const tell = () => {
  for (const l of listeners) l();
};

function askedFor(): string | null {
  try {
    return window.sessionStorage.getItem(NEXT_KEY);
  } catch {
    return null;
  }
}

export function askToListenAt(book: string, chapter: number): boolean {
  try {
    window.sessionStorage.setItem(NEXT_KEY, `${book}/${chapter}`);
  } catch {
    return false;
  }
  coming = `${book}/${chapter}`;
  tell();
  return true;
}

/** Whether this chapter's reading was asked for as it opened; the ask is taken, and the reading is on its way until readingCame. */
export function takeListenAsk(book: string, chapter: number): boolean {
  try {
    const waiting = window.sessionStorage.getItem(NEXT_KEY);
    if (waiting !== `${book}/${chapter}`) return false;
    window.sessionStorage.removeItem(NEXT_KEY);
  } catch {
    return false;
  }
  coming = `${book}/${chapter}`;
  tell();
  return true;
}

/** The chapter's reading began, or could not (no voice, no words): it is no longer on its way. */
export function readingCame(book: string, chapter: number): void {
  if (coming !== `${book}/${chapter}`) return;
  coming = null;
  tell();
}

/** Whether this chapter's reading is on its way: asked for as its page opened, and not yet begun. */
export function readingComing(book: string, chapter: number): boolean {
  const key = `${book}/${chapter}`;
  return coming === key || askedFor() === key;
}

function subscribe(changed: () => void): () => void {
  listeners.add(changed);
  return () => {
    listeners.delete(changed);
  };
}

/** readingComing for a component, drawn again as the reading comes. Never on the server: nothing is asked there. */
export function useReadingComing(book: string, chapter: number): boolean {
  return useSyncExternalStore(subscribe, () => readingComing(book, chapter), () => false);
}

/** For tests: the mark forgotten, as a reload forgets it (the ask itself is kept in the session). */
export function forgetComing(): void {
  coming = null;
}
