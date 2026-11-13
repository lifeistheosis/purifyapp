"use client";

/**
 * A chapter's reading asked for on the page about to open (1.7, 1.9): a
 * reading that ended rolls on into the next chapter, and the player's previous
 * and next step to a chapter the phone's voice reads, which needs that page's
 * own words. The page reads the ask as it opens (components/bible/ReadAloud.tsx,
 * ReadAloudFollow) and begins.
 */
const NEXT_KEY = "purify:readAloud.next";

export function askToListenAt(book: string, chapter: number): boolean {
  try {
    window.sessionStorage.setItem(NEXT_KEY, `${book}/${chapter}`);
    return true;
  } catch {
    return false;
  }
}

/** Whether this chapter's reading was asked for as it opened; the ask is taken. */
export function takeListenAsk(book: string, chapter: number): boolean {
  try {
    const waiting = window.sessionStorage.getItem(NEXT_KEY);
    if (waiting !== `${book}/${chapter}`) return false;
    window.sessionStorage.removeItem(NEXT_KEY);
    return true;
  } catch {
    return false;
  }
}
