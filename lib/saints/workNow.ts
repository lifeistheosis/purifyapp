"use client";

import { useSyncExternalStore } from "react";

import type { WorkShare } from "@/lib/reading/shareWork";

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
  /**
   * What ••• shares (1.9, build 95 note 15): the work's title, and its page
   * on the website at the part being read (lib/reading/shareWork.ts).
   */
  share: WorkShare;
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

/**
 * An ask for About this book that no reader has answered yet (1.9). In the
 * apps a work's text is read a moment after its page opens
 * (components/saints/LazyWritingReader.tsx), and the sheet is the reader's:
 * a tap on the cover at the book's head in that moment opened nothing, and a
 * second tap did. So an ask is kept until a reader answers it: the one that
 * is there hears it at once; the one that arrives next hears it as it
 * begins to listen. The cover forgets it as its page goes, so it never opens
 * over another book.
 */
let waiting = false;

export function openWorkAbout(): void {
  if (typeof window === "undefined") return;
  waiting = true;
  // A reader that is there answers inside this call (answerWorkAbout), and nothing is left waiting.
  window.dispatchEvent(new Event(WORK_ABOUT_EVENT));
}

/** The reader's, as it opens its sheet on an ask: the ask is answered. */
export function answerWorkAbout(): void {
  waiting = false;
}

/**
 * The reader's, once it has begun to listen: an ask made before it was there
 * is made again, for it to hear as it hears any other. After the reader's
 * first draw is done, so its sheet opens from an event and not from inside
 * the draw.
 */
export function hearWaitingWorkAbout(): void {
  if (!waiting || typeof window === "undefined") return;
  queueMicrotask(() => {
    if (waiting) window.dispatchEvent(new Event(WORK_ABOUT_EVENT));
  });
}

/** The cover's, as its page goes: an ask no reader answered goes with it. */
export function forgetWorkAbout(): void {
  waiting = false;
}

/** Whether an ask is waiting for a reader. For the tests. */
export function workAboutWaiting(): boolean {
  return waiting;
}
