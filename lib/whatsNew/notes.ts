import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ENTRIES, type Entry } from "@/lib/whatsNew/entries";
import { isoToDisplayDate } from "@/lib/whatsNew/dates";

/**
 * The release notes behind /whats-new, and where they came from.
 *
 * Same shape as lib/support/expenses.ts, for the same reason: an admin edits
 * the live rows from /admin, the committed file is the fallback, and the page
 * must be able to tell which one it is showing. A note edited this morning
 * and a note from the last deploy are different claims.
 *
 * THE TABLE MAY NOT EXIST. supabase/migrations/20260904_patch_notes.sql ships
 * NOT SIGNED OFF, and AGENTS.md records that merged and applied are
 * independently true. 42P01 is caught here like any other failure and the
 * reader gets the file. Nothing on the public page can 500 because of an
 * unapplied migration.
 *
 * THE NATIVE APP ALWAYS GETS THE FILE. The static export has no server and
 * the build machine has no service role key, so createAdminClient throws,
 * this catches, and the bundle carries data/changelog/entries.json. Keep that
 * file current with `node scripts/patch-notes.mjs pull` before a native build.
 */

export type PatchNoteRow = {
  id: string;
  version: string;
  kind: string;
  date: string; // ISO YYYY-MM-DD as stored
  title: string;
  blurb: string;
  items: string[];
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
  updated_by_email: string | null;
};

export const PATCH_NOTE_COLUMNS =
  "id, version, kind, date, title, blurb, items, status, published_at, updated_at, updated_by_email";

export type NotesData = {
  entries: Entry[];
  /** True when the live read failed or returned nothing and the committed
      list in data/changelog/entries.json is being shown instead. */
  fromFallback: boolean;
  /** Most recent edit across the live rows. Null on the fallback path. */
  updatedAt: Date | null;
};

export function rowToEntry(r: PatchNoteRow): Entry {
  return {
    version: r.version,
    kind: r.kind,
    date: isoToDisplayDate(r.date),
    blurb: r.blurb,
    items: Array.isArray(r.items) ? r.items.map(String) : [],
  };
}

export async function getPatchNotes(
  opts: { includeDrafts?: boolean } = {},
): Promise<NotesData> {
  const fallback: NotesData = { entries: ENTRIES, fromFallback: true, updatedAt: null };
  try {
    const supa = createAdminClient();
    let q = supa
      .from("patch_notes")
      .select(PATCH_NOTE_COLUMNS)
      .order("date", { ascending: false })
      .order("version", { ascending: false });
    if (!opts.includeDrafts) q = q.eq("status", "published");
    const { data, error } = await q;
    if (error || !data || data.length === 0) return fallback;

    let updatedAt: Date | null = null;
    for (const r of data as PatchNoteRow[]) {
      const d = new Date(r.updated_at);
      if (!Number.isNaN(d.getTime()) && (!updatedAt || d > updatedAt)) updatedAt = d;
    }
    return {
      entries: (data as PatchNoteRow[]).map(rowToEntry),
      fromFallback: false,
      updatedAt,
    };
  } catch {
    return fallback;
  }
}
