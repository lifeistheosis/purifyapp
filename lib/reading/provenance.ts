import provenance from "@/data/reading/provenance.json";

import type { ReadingEntry, WorkKey } from "./entries";

/**
 * Where a reading-room work's words come from, said at the top of its page
 * (1.8, the owner's word of 2026-10-24 on the source badge).
 *
 *   checked  read word for word against the edition named (F-49: CCEL's
 *            transcription measured by eight-word runs, or the scan read by
 *            hand), listed in data/reading/provenance.json. `withNotes` when
 *            some sections, or the introductions above them, are ours.
 *   ours     a retelling: Purify's words about the saint, never his.
 *
 * Anything else says nothing new: its source stands at the foot of the page,
 * as it always has. The list claims only what was checked.
 */
export type Provenance = { kind: "checked"; edition: string; withNotes: boolean } | { kind: "ours" };

type Row = { edition: string; share?: number; withNotes?: boolean };
const WORKS = (provenance as { works: Record<string, Row> }).works;

export function provenanceOf(key: WorkKey, entry: Pick<ReadingEntry, "form">): Provenance | null {
  if (entry.form === "retelling") return { kind: "ours" };
  const row = WORKS[key];
  return row ? { kind: "checked", edition: row.edition, withNotes: Boolean(row.withNotes) } : null;
}

/** Every work the list names, for its test. */
export const CHECKED_KEYS: readonly string[] = Object.keys(WORKS);

type SectionsRow = { edition: string; checked: number[] };

/**
 * Works checked word for word in some sections only (2026-10-26: St Cyril
 * on Luke's fragments on Luke 1 and Sermons 1 to 5, against the 1859
 * printing). The work's page claims nothing for them, since most of it is
 * not checked; a reading path may read those sections and no others.
 */
export const CHECKED_SECTIONS: Readonly<Record<string, readonly number[]>> = Object.fromEntries(
  Object.entries((provenance as { sections?: Record<string, SectionsRow> }).sections ?? {}).map(([k, v]) => [k, v.checked]),
);
