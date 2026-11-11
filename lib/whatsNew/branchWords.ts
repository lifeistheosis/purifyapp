import { displayDateToIso } from "./dates";
import type { Entry } from "./entries";
import type { PatchNoteRow } from "./notes";
import { describeChange, type PatchNoteInput } from "./patchNoteShape";
import { cleanName } from "./releaseName";
import { itemKey, normaliseItems } from "./updateHierarchy";

/**
 * The notes whose words in the release's own file differ from the table's
 * (2026-11-11, the arbiter: "all 73 lines ... through one Accept all that
 * shows him every before and after").
 *
 * What's new reads its notes from the patch_notes table; the committed file
 * (data/changelog/entries.json, ENTRIES) is the apps' copy and the website's
 * fallback. A release can change an old note's words in the file: 1.9 says
 * the old notes' keys, hovering and code in plain words, and moved two old
 * addresses. AGENTS.md has such a change reach the table only through the
 * owner's Accept, never straight in. This finds every note whose file words
 * differ, as a proposal with its before and after, for the queue in Releases.
 *
 * The title is the table's alone (the file has none), so it is neither
 * compared nor proposed. A release's name the file does not give is kept.
 * A note that already waits in the queue is left to that proposal.
 */

export type BranchWords = {
  version: string;
  noteId: string | null;
  before: PatchNoteInput | null;
  after: PatchNoteInput;
  summary: string;
};

/** A table row as the queue's note shape. */
export function rowAsInput(row: PatchNoteRow): PatchNoteInput {
  return {
    version: row.version,
    name: cleanName(row.name),
    kind: row.kind ?? "",
    date: row.date,
    title: row.title ?? "",
    blurb: row.blurb ?? "",
    items: normaliseItems(row.items),
  };
}

/** The file's note in the same shape, keeping what only the table holds. Null for a date the file writes wrongly. */
export function entryAsInput(e: Entry, row: PatchNoteRow | null): PatchNoteInput | null {
  const date = displayDateToIso(e.date);
  if (!date) return null;
  return {
    version: e.version,
    name: cleanName(e.name) || cleanName(row?.name),
    kind: e.kind ?? "",
    date,
    title: row?.title ?? "",
    blurb: e.blurb ?? "",
    items: normaliseItems(e.items),
  };
}

const said = (n: PatchNoteInput) => JSON.stringify([n.version, n.name, n.kind, n.date, n.title, n.blurb, n.items.map((it) => itemKey(it))]);

/** Every note whose file words differ from the table's, newest first as the file stands; none for a note already waiting. */
export function branchWords(entries: readonly Entry[], rows: readonly PatchNoteRow[], waiting: ReadonlySet<string>): BranchWords[] {
  const byVersion = new Map(rows.map((r) => [r.version, r]));
  const out: BranchWords[] = [];
  for (const e of entries) {
    if (waiting.has(e.version)) continue;
    const row = byVersion.get(e.version) ?? null;
    const after = entryAsInput(e, row);
    if (!after) continue;
    const before = row ? rowAsInput(row) : null;
    if (before && said(before) === said(after)) continue;
    const summary = describeChange(before, after);
    if (summary) out.push({ version: e.version, noteId: row?.id ?? null, before, after, summary });
  }
  return out;
}
