"use client";

import { useState } from "react";

import { JournalComposer } from "@/components/journal/JournalComposer";
import { noteKey } from "@/lib/journal/feed";
import type { JournalDraft } from "@/lib/journal/entries";
import { softTick } from "@/lib/ui/softTick";

/** What was typed on a verse's note and closed, if anything. */
function readDraft(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * A note on a verse, written in the journal's own sheet (1.9, build 88 note 3
 * and docs/1.9-build/JOURNAL.md: "notes on verses are pages on a verse").
 *
 * The note used to open in a box under the verse: a field with a square
 * frame inside a round one, a resize grip, the computer's keyboard hints on a
 * phone ("Esc to close", "⌘+Enter to save"), no sign of which verse it was
 * for, and what was typed lost when it closed. It opens here instead, in the
 * sheet the journal writes in (components/journal/JournalComposer.tsx), as
 * tall as the keyboard leaves, the verse in its words on top and the note in
 * Lora under it; on a tablet and a computer, the journal's centred panel.
 *
 * Close keeps what was typed, for that verse, until it is opened again; Done
 * keeps the note, or takes it off when the words were cleared. The note
 * stays the verse's (lib/bible/annotations.ts): nothing here speaks of the
 * journal, which is Plus, and the note is free.
 */
export function VerseNoteSheet({
  open,
  book,
  chapter,
  verse,
  label,
  note,
  onSave,
  onClose,
}: {
  open: boolean;
  book: string;
  chapter: number;
  verse: number;
  /** The verse's name in the reader's language: "John 1:47". */
  label: string;
  /** The note as it is kept now, if there is one. */
  note: string | undefined;
  /** Keep these words as the verse's note; empty takes it off. */
  onSave: (body: string) => void;
  onClose: () => void;
}) {
  const draftKey = `purify:note-draft:${book}:${chapter}:${verse}`;
  const blank = (body: string): JournalDraft => ({
    kind: "reflection",
    body,
    source: { type: "verse", book, chapter, verse, label },
    editing: noteKey(book, chapter, verse),
  });
  const [draft, setDraft] = useState<JournalDraft>(() => blank(note ?? ""));

  // On opening: what was typed and closed last, else the note as it is. Set
  // as the sheet opens, during the render that opens it (React's way to
  // follow a prop), not in an effect after it.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(blank(readDraft(draftKey) ?? note ?? ""));
  }

  const keepDraft = (body: string) => {
    try {
      if (body.trim() === (note ?? "").trim()) window.localStorage.removeItem(draftKey);
      else window.localStorage.setItem(draftKey, body);
    } catch {
      /* a draft is a kindness, not a promise */
    }
  };

  return (
    <JournalComposer
      open={open}
      draft={draft}
      openLink={false}
      onChange={(next) => {
        setDraft(next);
        keepDraft(next.body);
      }}
      onClose={onClose}
      onDone={() => {
        const body = draft.body.trim();
        onSave(body);
        try {
          window.localStorage.removeItem(draftKey);
        } catch {
          /* nothing kept */
        }
        if (body) softTick();
        onClose();
      }}
      sourceLabel={(s) => s.label}
    />
  );
}
