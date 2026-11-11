"use client";

// The device's side of lib/journal/waiting.ts: the page being written, kept
// as Done keeps it, and what waits kept before the journal opens anything
// else (1.9, the journal's fact 17).
//
// One way to keep, for Done and for the page that waits: the same entry, the
// same dates, the same sync (lib/journal/entries.ts writes the list and tells
// the sync, as it always has), and nothing more.

import { readVerseAnnotation, writeVerseAnnotation } from "@/lib/bible/annotations";

import { addRecord, readDraft, readRecords, removeRecord, updateRecord, type JournalDraft } from "./entries";
import { draftIsEmpty, keeping, openOver, waits, type Keeping, type Kept } from "./waiting";

const KEPT: Kept = {
  record: (id) => readRecords().find((r) => r.id === id),
  note: (book, chapter, verse) => readVerseAnnotation(book, chapter, verse).note,
};

function carryOut(k: Keeping): void {
  if (k.do === "add") addRecord({ kind: k.kind, body: k.body, prompt: k.prompt, source: k.source });
  else if (k.do === "update") updateRecord(k.id, { kind: k.kind, body: k.body, prompt: k.prompt, source: k.source });
  else if (k.do === "remove") removeRecord(k.id);
  else if (k.do === "note") {
    const before = readVerseAnnotation(k.book, k.chapter, k.verse);
    // Back on its verse, dated now. Taken off, a highlight on the verse stays.
    writeVerseAnnotation(k.book, k.chapter, k.verse, { ...before, note: k.note || undefined, noteAt: k.note ? new Date().toISOString() : undefined, at: undefined });
  }
}

/** Done: keep the page being written. Returns what was done with it. */
export function keepDone(draft: JournalDraft): Keeping {
  const k = keeping(draft, KEPT);
  carryOut(k);
  return k;
}

/**
 * Keep a page that waits, as Done keeps it. An empty one makes nothing and
 * takes nothing away. Returns what was done with it.
 */
export function keepWaiting(waiting: JournalDraft | null): Keeping {
  if (!waiting || draftIsEmpty(waiting)) return { do: "nothing" };
  return keepDone(waiting);
}

/** Does this page wait when the sheet is closed: is there something on it that is not kept yet? */
export function draftWaits(draft: JournalDraft): boolean {
  return waits(draft, KEPT);
}

/**
 * The journal is asked to open `next`: what waits is kept first, unless it is
 * the same page, which goes on. Returns the page to open.
 */
export function openKeeping(next: JournalDraft): JournalDraft {
  const step = openOver(readDraft(), next, KEPT);
  carryOut(step.keep);
  return step.open;
}
