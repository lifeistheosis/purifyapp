"use client";

import { useSyncExternalStore } from "react";

/**
 * The chapter of a work on the screen, for what stands outside the reader
 * (1.8, the owner's pick A of r3-29): the ••• button over the page is the
 * page's top bar's (components/nav/MobileTopBar.tsx, `plates`), drawn by the
 * page and not by the reader, and its sheet bookmarks the chapter being read.
 * The reader writes it as the chapter changes and clears it as it goes.
 *
 * And the two sheets the reader holds, asked for from elsewhere on the page
 * the way the Bible's books sheet is (lib/bible/booksSheet.ts): the contents,
 * opened by the chapter's title and the pill's name, and About this book,
 * opened from ••• and from the contents.
 */

export type WorkNow = {
  saintSlug: string;
  saintName: string;
  workSlug: string;
  workTitle: string;
  sectionN: number;
  sectionTitle: string;
  /** The chapter's name as the reader says it: "Conference 10 · 10", "Homily 15". */
  label: string;
};

let now: WorkNow | null = null;
const listeners = new Set<() => void>();

export function setWorkNow(next: WorkNow | null): void {
  now = next;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** The chapter on the screen; none on the server, or with no work open. */
export function useWorkNow(): WorkNow | null {
  return useSyncExternalStore(subscribe, () => now, () => null);
}

/** Dispatched on window to open the work's contents over the chapter. */
export const WORK_CONTENTS_EVENT = "purify:work-contents-open";
/** Dispatched on window to open About this book over the chapter. */
export const WORK_ABOUT_EVENT = "purify:work-about-open";

export function openWorkContents(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(WORK_CONTENTS_EVENT));
}

export function openWorkAbout(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(WORK_ABOUT_EVENT));
}
