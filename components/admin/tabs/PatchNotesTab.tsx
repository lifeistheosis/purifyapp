"use client";

// Patch notes, folded into Releases by his pick A on r3-17 (2026-10-30): the
// review queue is step 1 of the one path (the note, with Claude's proposed
// change and Accept inside it), and the notes themselves are under its
// Records. The view keeps its id, so #tab=patch-notes still lands, on step 1.
// The parts are components/admin/releases/notes.tsx.

import { ReleasesPage } from "./DropTab";

export function PatchNotesTab() {
  return <ReleasesPage focus="note" />;
}
