import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { ENTRIES } from "@/lib/whatsNew/entries";
import { displayDateToIso } from "@/lib/whatsNew/dates";
import { PATCH_NOTE_COLUMNS, type PatchNoteRow } from "@/lib/whatsNew/notes";
import { CURRENT_VERSION } from "@/lib/whatsNew/version";
import { isTableAbsent } from "@/lib/admin/tableAbsent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type RevisionRow = {
  id: string;
  note_id: string | null;
  version: string;
  author: string;
  summary: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  status: "pending" | "accepted" | "denied" | "suggested";
  review_note: string | null;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  parent_id: string | null;
  created_at: string;
};

export type PatchNotesPayload = {
  notes: PatchNoteRow[];
  revisions: RevisionRow[];
  /** True when the table is empty and `notes` is the committed file, unsaved. */
  fromFallback: boolean;
  /** True when the table does not exist. Editing is impossible until it does. */
  tableAbsent: boolean;
  currentVersion: string;
};

// Patch notes:
//   - every row of patch_notes, drafts included, newest first
//   - the open revisions (pending + suggested), oldest first, so the queue
//     reads in the order things were proposed
//   - the committed file as the fallback when the table is empty, with ids
//     of -1, -2, ... the way the expense fallback does, so the tab can offer
//     "Adopt all" and the rows still key cleanly
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supa = createAdminClient();
  const [{ data: notes, error: notesError }, { data: revisions, error: revError }] =
    await Promise.all([
      supa
        .from("patch_notes")
        .select(PATCH_NOTE_COLUMNS)
        .order("date", { ascending: false })
        .order("version", { ascending: false }),
      supa
        .from("patch_note_revisions")
        .select("*")
        .in("status", ["pending", "suggested"])
        .order("created_at", { ascending: true }),
    ]);

  const tableAbsent = isTableAbsent(notesError) || isTableAbsent(revError);

  // The error is checked, not discarded, for the reason the sustainability
  // route documents: falling back on a FAILED read is different from falling
  // back on an EMPTY table, and offering "Adopt all" against a table that was
  // never empty would write every entry twice.
  const fromFallback = !notesError && (!notes || notes.length === 0);

  const fallbackRows: PatchNoteRow[] = fromFallback
    ? ENTRIES.map((e, i) => ({
        id: String(-1 - i),
        version: e.version,
        kind: e.kind,
        date: displayDateToIso(e.date) ?? e.date,
        title: "",
        blurb: e.blurb,
        items: e.items,
        status: "published",
        published_at: null,
        updated_at: "",
        updated_by_email: null,
      }))
    : [];

  const payload: PatchNotesPayload = {
    // Length, not nullish: an empty table answers [] and `[] ?? fallback` is
    // [], which rendered "Adopt all 0" against ninety-one committed entries.
    notes: !notesError && notes && notes.length > 0 ? (notes as PatchNoteRow[]) : fallbackRows,
    revisions: revError ? [] : ((revisions as RevisionRow[] | null) ?? []),
    fromFallback: fromFallback || Boolean(notesError),
    tableAbsent,
    currentVersion: CURRENT_VERSION,
  };
  return NextResponse.json(payload);
}
