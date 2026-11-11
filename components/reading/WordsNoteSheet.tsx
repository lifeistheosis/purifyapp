"use client";

import { useState } from "react";

import { JournalComposer } from "@/components/journal/JournalComposer";
import type { JournalDraft } from "@/lib/journal/entries";
import { softTick } from "@/lib/ui/softTick";

/** What was typed on these words' note and closed, if anything. */
function readDraft(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** The most of the words shown over the note: a long passage is named by how it opens. */
const SHOWN = 280;

/**
 * A note on words of a text, written in the house's own sheet (build 93 note
 * 17, the owner's word of 2026-11-11: "Refine the works note system, and it
 * should be very similar to the Bible's UI when you hold down a verse").
 *
 * The sheet a verse's note is written in (components/bible/VerseNoteSheet.tsx,
 * the journal's): as tall as the keyboard leaves, the words the note is on
 * above it, Close and Done. Until then a note in a Father's work opened as a
 * boxed field inside the text with a resize grip and a computer's keyboard
 * hints on a phone, and what was typed was lost when it closed.
 *
 * Close keeps what was typed, for these words, until it is opened again; Done
 * keeps the note, or takes it off when the words were cleared.
 */
export function WordsNoteSheet({
  open,
  words,
  note,
  draftKey,
  onSave,
  onClose,
}: {
  open: boolean;
  /** The words the note is on. */
  words: string;
  /** The note as it is kept now, if there is one. */
  note: string | undefined;
  /** Names these words, so what was typed and closed is kept for them alone. */
  draftKey: string;
  /** Keep this as the note; empty takes it off. */
  onSave: (body: string) => void;
  onClose: () => void;
}) {
  const key = `purify:note-draft:${draftKey}`;
  const shown = words.length > SHOWN ? `${words.slice(0, SHOWN).trimEnd()}…` : words;
  const blank = (body: string): JournalDraft => ({
    kind: "reflection",
    body,
    prompt: { text: shown },
    // A note, as a verse's is: Done is offered on an empty one, to take the note off.
    editing: `note:words:${draftKey}`,
  });
  // Mounted open (a paragraph mounts it only when its note is asked for): what was typed and closed last, else the note.
  const [draft, setDraft] = useState<JournalDraft>(() => blank((open ? readDraft(key) : null) ?? note ?? ""));

  // On opening: what was typed and closed last, else the note as it is. Set
  // during the render that opens it, not in an effect after it.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(blank(readDraft(key) ?? note ?? ""));
  }

  const keepDraft = (body: string) => {
    try {
      if (body.trim() === (note ?? "").trim()) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, body);
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
          window.localStorage.removeItem(key);
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
