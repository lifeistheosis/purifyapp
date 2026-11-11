// What waits is never lost (1.9, the journal's fact 17, found on 2026-11-11
// while build 93's note 8 was being mended: "Honestly, just buggy").
//
// The journal keeps one page being written (lib/journal/entries.ts,
// purify:journal.draft). Closed, it waits, and Write says "Continue writing".
// Until this file, whatever the journal opened next took its place: a reader
// who wrote half a thought, closed the sheet and tapped an older entry (or a
// reading's pen, or a plan's question) lost the half thought without a word.
//
// The rule, approved the same day: before the journal opens anything else,
// what waits is kept exactly as Done keeps it; opening the same page goes on
// with it. Two edges: an empty page makes nothing (and never takes an entry
// away: only Done on an emptied page does that), and a kept page opened and
// left unchanged makes no second copy and takes no new date.
//
// Done's own rules live here too, so "as Done keeps it" is one function and
// not two that drift: `keeping` is what Done does, and what the journal does
// for a page that waits.
//
// Pure: no React, no storage. The device's side is lib/journal/keepDraft.ts;
// lib/journal/__tests__/waiting.test.ts holds this.

import type { JournalDraft, JournalKind, JournalPrompt, JournalRecord, JournalSource } from "./entries";
import { pageIsEmpty, parsePage, serializePage } from "./page";

/** The verse a note being changed is on, read from the draft's `editing` (lib/journal/feed.ts, noteKey). Null when it is not a verse's note. */
export function noteVerse(editing: string | undefined): { book: string; chapter: number; verse: number } | null {
  if (!editing?.startsWith("note:")) return null;
  const [, book, chapter, verse] = editing.split(":");
  const c = Number(chapter);
  const v = Number(verse);
  return book && Number.isInteger(c) && c > 0 && Number.isInteger(v) && v > 0 ? { book, chapter: c, verse: v } : null;
}

/**
 * Nothing on it worth keeping: a note with no words, or a page with none
 * (lib/journal/page.ts, pageIsEmpty). A page that only names its notebook, its
 * tags or its look is empty: a reader who taps "Write in this gathering" and
 * closes the sheet has written nothing.
 */
export function draftIsEmpty(draft: JournalDraft): boolean {
  return draft.editing?.startsWith("note:") ? !draft.body.trim() : pageIsEmpty(parsePage(draft.body));
}

/** What is done with a page: nothing, a new entry, a kept entry changed, a kept entry taken away, or a verse's note written (empty takes it off). */
export type Keeping =
  | { do: "nothing" }
  | { do: "add"; kind: JournalKind; body: string; prompt?: JournalPrompt; source?: JournalSource }
  | { do: "update"; id: string; kind: JournalKind; body: string; prompt?: JournalPrompt; source?: JournalSource }
  | { do: "remove"; id: string }
  | { do: "note"; book: string; chapter: number; verse: number; note: string };

/** What is already kept, as the rules ask for it. */
export type Kept = {
  /** A kept entry by its id, a removed one included; undefined when there is none. */
  record: (id: string) => JournalRecord | undefined;
  /** The note on a verse now, if it has one. */
  note: (book: string, chapter: number, verse: number) => string | undefined;
};

const NOTHING: Keeping = { do: "nothing" };

/** The same page, however it was written down: the same text, or the same once each is read as a page and written again. */
function sameBody(a: string, b: string): boolean {
  if (a.trim() === b.trim()) return true;
  return serializePage(parsePage(a)) === serializePage(parsePage(b));
}

/**
 * What Done does with the page being written.
 *
 * A verse's note goes back on its verse; with no words it is taken off. A kept
 * entry is changed; emptied, it is taken away. A new page with something on
 * it becomes an entry; an empty one makes nothing. Changes to an entry that
 * has been taken away since are kept as a page of their own.
 *
 * Nothing is done where nothing changed: a kept entry, or a note, left as it
 * was is not written again, so it takes no new date and is not sent again.
 * Until 2026-11-11 Done stamped an entry it had not changed.
 */
export function keeping(draft: JournalDraft, kept: Kept): Keeping {
  const body = draft.body.trim();
  if (draft.editing?.startsWith("note:")) {
    const at = noteVerse(draft.editing);
    if (!at) return NOTHING;
    return body === (kept.note(at.book, at.chapter, at.verse) ?? "").trim() ? NOTHING : { do: "note", ...at, note: body };
  }
  const empty = draftIsEmpty(draft);
  const asNew: Keeping = { do: "add", kind: draft.kind, body, prompt: draft.prompt, source: draft.source };
  if (draft.editing) {
    const record = kept.record(draft.editing);
    // Taken away, here or on another of the reader's devices, or let go long since.
    const gone = !record || !!record.deletedAt;
    if (empty) return gone ? NOTHING : { do: "remove", id: record.id };
    if (record && record.kind === draft.kind && sameBody(record.body, body)) return NOTHING;
    // Changes to an entry that has gone since: the words are kept as a page of
    // their own. Until 2026-11-11 they were put on the removed entry, where no
    // one saw them again.
    if (gone) return asNew;
    return { do: "update", id: record.id, kind: draft.kind, body, prompt: draft.prompt, source: draft.source };
  }
  return empty ? NOTHING : asNew;
}

/**
 * Does this page wait when the sheet is closed? One with something on it that
 * is not kept yet: a new page, or a kept one with changes. A kept entry or a
 * verse's note opened and left as it was has nothing to go on with: the
 * reader read it, and Write begins a new page. Until 2026-11-11 it waited:
 * after an old entry was read, Write said "Continue writing" and opened that
 * entry again, and a new page could not be begun until Done was pressed on it.
 */
export function waits(draft: JournalDraft, kept: Kept): boolean {
  if (draftIsEmpty(draft)) return false;
  return !draft.editing || keeping(draft, kept).do !== "nothing";
}

function samePrompt(a: JournalPrompt | undefined, b: JournalPrompt | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.key && b.key ? a.key === b.key : a.text === b.text;
}

/** The same place, whatever it is called in the reader's language today. */
function sameSource(a: JournalSource | undefined, b: JournalSource | undefined): boolean {
  if (!a || !b) return !a && !b;
  const facts = (s: JournalSource) =>
    JSON.stringify(
      Object.entries(s)
        .filter(([k]) => k !== "label")
        .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)),
    );
  return facts(a) === facts(b);
}

/**
 * Are these one page? A kept entry or a verse's note is itself, by what it
 * is. Two new pages are one when they were begun from the same place: the
 * same question, the same reading, or nowhere (Write).
 */
export function samePage(a: JournalDraft, b: JournalDraft): boolean {
  if (a.editing || b.editing) return a.editing === b.editing;
  return samePrompt(a.prompt, b.prompt) && sameSource(a.source, b.source);
}

/**
 * The journal is asked to open `next` while `waiting` waits.
 *
 * Nothing waits, or what waits is empty: `next` opens. The same page: what
 * waits goes on, since its words are newer than the kept ones. Another page:
 * what waits is kept as Done keeps it, then `next` opens.
 */
export function openOver(waiting: JournalDraft | null, next: JournalDraft, kept: Kept): { keep: Keeping; open: JournalDraft } {
  if (!waiting || draftIsEmpty(waiting)) return { keep: NOTHING, open: next };
  if (samePage(waiting, next)) return { keep: NOTHING, open: waiting };
  return { keep: keeping(waiting, kept), open: next };
}
