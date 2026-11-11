"use client";

// What a gathering's page asks of the journal (1.9, build 93 note 19): to
// begin a page in the gathering, a gathered line as its card when one is
// given, and to open one of the pages already written there. The rules are
// lib/journal/gatherings.ts; this is the device's side of them.

import { MAX_BODY, readDraft, readRecords, writeDraft, writeRecords } from "./entries";
import { draftInGathering, renameNotebook, writingIn } from "./gatherings";
import { keepWaiting } from "./keepDraft";
import type { PageBlock } from "./page";
import { JOURNAL_OPEN_KEY } from "./quoteInJournal";

/** Set as a gathering asks for one of its pages, read and cleared by the journal as it opens: the page's id. */
export const JOURNAL_PAGE_KEY = "purify:journal.page";

/**
 * Begin a page in a gathering, or go on with the page being written there,
 * and ask the journal to open on it. Anything else that waits is kept first,
 * as Done keeps it, and is never written over (lib/journal/waiting.ts). False
 * when the page could not take the card (it would grow past the server's
 * limit): then nothing is changed.
 */
export function writeInGathering(title: string, block: PageBlock | null): boolean {
  if (typeof window === "undefined") return false;
  const waiting = readDraft();
  const next = draftInGathering(waiting, title, block, MAX_BODY);
  if (!next) return false;
  if (waiting && !writingIn(waiting, title)) keepWaiting(waiting);
  writeDraft(next);
  try {
    window.sessionStorage.setItem(JOURNAL_OPEN_KEY, "1");
  } catch {
    /* the journal opens on its list; Write goes on with the page */
  }
  return true;
}

/** Ask the journal to open one kept page, by its id. */
export function askJournalPage(id: string): void {
  try {
    window.sessionStorage.setItem(JOURNAL_PAGE_KEY, id);
  } catch {
    /* the journal opens on its list, where the page is */
  }
}

/** Read once, as the journal opens: the kept page it was asked to open, if any. */
export function takeJournalPage(): string | null {
  try {
    const id = window.sessionStorage.getItem(JOURNAL_PAGE_KEY);
    window.sessionStorage.removeItem(JOURNAL_PAGE_KEY);
    return id || null;
  } catch {
    return null;
  }
}

/**
 * A gathering renamed takes its pages with it: every page in the notebook
 * that bore the old name is moved to the new one, dated now, so the change
 * travels as any other. Returns how many pages moved.
 */
export function renameGatheringPages(from: string, to: string, now: Date = new Date()): number {
  const all = readRecords();
  const moved = new Map(renameNotebook(all, from, to).map((r) => [r.id, r]));
  if (moved.size === 0) return 0;
  const at = now.toISOString();
  writeRecords(all.map((r) => (moved.has(r.id) ? { ...moved.get(r.id)!, updatedAt: at } : r)));
  return moved.size;
}
