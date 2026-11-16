"use client";

// A note on a verse, written on the journal's page (1.9; round 3's apply).
//
// It was written in the journal's sheet over the chapter
// (components/bible/VerseNoteSheet.tsx, build 88 note 3), and the journal's
// own pages moved to a page of their own in round 3 (his yes, 2026-11-16).
// So the note goes there too: one place to write, the same Done. The page
// keeps it on its verse (lib/journal/keepDraft.ts: a draft whose `editing` is
// the note's key writes the verse's note), and Back or Done returns to the
// chapter, where the verse shows it as before (lib/bible/annotations.ts).
//
// What the sheet kept for one verse, typed and closed, was kept under its own
// key. It is carried onto the page the first time that verse's note opens,
// and the key goes: from now on what waits is the journal's one kept draft,
// by the journal's own rules (lib/journal/waiting.ts).

import { writeDraft } from "./entries";
import { openKeeping } from "./keepDraft";
import { WRITE_FROM_VERSE_HREF, verseNoteDraft } from "./openWriting";

/** Where the old sheet kept a verse's note typed and closed, one per verse. */
export function oldNoteDraftKey(book: string, chapter: number, verse: number): string {
  return `purify:note-draft:${book}:${chapter}:${verse}`;
}

/** Open the writing page on a verse's note: its words as kept, or as typed and closed in the old sheet. */
export function openVerseNote(
  router: { push: (href: string) => void },
  at: { book: string; chapter: number; verse: number; label: string; note: string | undefined },
): void {
  let body = at.note ?? "";
  try {
    const key = oldNoteDraftKey(at.book, at.chapter, at.verse);
    const typed = window.localStorage.getItem(key);
    if (typed !== null) {
      body = typed;
      window.localStorage.removeItem(key);
    }
  } catch {
    /* a draft is a kindness, not a promise */
  }
  writeDraft(openKeeping(verseNoteDraft({ book: at.book, chapter: at.chapter, verse: at.verse, label: at.label, body })));
  router.push(WRITE_FROM_VERSE_HREF);
}
