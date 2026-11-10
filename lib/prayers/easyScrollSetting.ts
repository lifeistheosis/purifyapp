"use client";

import { useSyncExternalStore } from "react";

/**
 * The reader's choice for Easy Scroll (1.9, build 89 note 7; the arbiter's
 * yes of 2026-11-10 to a row in Settings): on unless the reader turns it off,
 * kept on this device. With Purify's motion off it rests anyway
 * (components/prayers/service/useEasyScroll.ts); this is the choice to have
 * prayer pages scroll as any page while motion stays on.
 */
export const EASY_SCROLL_KEY = "purify.easyScroll";
const EVENT = "purify:easy-scroll";

/** On unless the reader chose off. Storage shut: on, the default. */
export function easyScrollOn(): boolean {
  try {
    return window.localStorage.getItem(EASY_SCROLL_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setEasyScroll(on: boolean): void {
  try {
    window.localStorage.setItem(EASY_SCROLL_KEY, on ? "on" : "off");
  } catch {
    /* private mode: the choice holds for this page view only */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useEasyScrollOn(): boolean {
  return useSyncExternalStore(subscribe, easyScrollOn, () => true);
}
