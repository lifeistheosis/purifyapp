// Where the journal is, and where it is written (1.9, Fable round 3: the
// writing is a page of its own, components/journal/JournalWritePage.tsx, and
// not a sheet over the journal's list).
//
// Whatever opens the writing page writes the page to be written into the
// journal's kept draft first (lib/journal/entries.ts, writeDraft), keeping
// what waited (lib/journal/keepDraft.ts, openKeeping), and then goes here.
// The page reads the draft on the device, so it is one static page in the
// apps' export, whichever entry or day it is opened for.

import type { JournalDraft } from "./entries";
import { noteKey } from "./feed";

/** The journal's list. Where the writing page's way back leads when nothing is behind it. */
export const JOURNAL_HREF = "/journal";

/** The page the journal is written on. */
export const WRITE_HREF = "/journal/write";

/** The writing page, opened on one kept page by its id. */
export function writeHrefFor(id: string): string {
  return `${WRITE_HREF}?entry=${encodeURIComponent(id)}`;
}

/**
 * The writing page, opened from a verse for that verse's note (round 3's
 * apply: a note on a verse is written on the page too). The page then draws
 * no Open back to the verse: the reader came from it, and Back returns there.
 */
export const WRITE_FROM_VERSE_HREF = `${WRITE_HREF}?from=verse`;

/** Was the writing page opened from a verse for its note? Read from the page's own address. */
export function openedFromVerse(search: string): boolean {
  return new URLSearchParams(search).get("from") === "verse";
}

/** A verse's note as the page to write: the verse its source, its key the note's (lib/journal/feed.ts, noteKey). */
export function verseNoteDraft(at: { book: string; chapter: number; verse: number; label: string; body: string }): JournalDraft {
  return {
    kind: "reflection",
    body: at.body,
    source: { type: "verse", book: at.book, chapter: at.chapter, verse: at.verse, label: at.label },
    editing: noteKey(at.book, at.chapter, at.verse),
  };
}
