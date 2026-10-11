import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { ENTRIES, type Entry } from "@/lib/whatsNew/entries";
import { isoToDisplayDate } from "@/lib/whatsNew/dates";
import { cleanName, withReleaseNames } from "@/lib/whatsNew/releaseName";
import { normaliseItems, type NoteItem } from "@/lib/whatsNew/updateHierarchy";

/**
 * The release notes behind /whats-new, and where they came from.
 *
 * Same shape as lib/support/expenses.ts, for the same reason: an admin edits
 * the live rows from /admin, the committed file is the fallback, and the page
 * must be able to tell which one it is showing. A note edited this morning
 * and a note from the last deploy are different claims.
 *
 * THE TABLE MAY NOT EXIST. supabase/migrations/20260904000100_patch_notes.sql ships
 * NOT SIGNED OFF, and AGENTS.md records that merged and applied are
 * independently true. 42P01 is caught here like any other failure and the
 * reader gets the file. Nothing on the public page can 500 because of an
 * unapplied migration.
 *
 * THE NATIVE APP ALWAYS GETS THE FILE. The static export has no server and
 * the build machine has no service role key, so createAdminClient throws,
 * this catches, and the bundle carries data/changelog/entries.json. Keep that
 * file current with `node scripts/patch-notes.mjs pull` before a native build.
 *
 * THE NAME COLUMN MAY NOT EXIST EITHER. A release's name
 * (lib/whatsNew/releaseName.ts) is one column added after the table, by SQL
 * the owner runs. A read that named it against a table without it would fail
 * whole, and the reader would be handed the file in place of this morning's
 * edit. So every read goes through withNameColumn: it asks for the name, and
 * where the table has none it asks again without it.
 */

export type PatchNoteRow = {
  id: string;
  version: string;
  /** Absent on a row read from a table that has no name column yet. */
  name?: string;
  kind: string;
  date: string; // ISO YYYY-MM-DD as stored
  title: string;
  blurb: string;
  items: NoteItem[];
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
  updated_by_email: string | null;
};

export const PATCH_NOTE_COLUMNS =
  "id, version, kind, date, title, blurb, items, status, published_at, updated_at, updated_by_email";

/** The same columns and the release's name, for a table that has it. */
export const PATCH_NOTE_COLUMNS_NAMED = `${PATCH_NOTE_COLUMNS}, name`;

type ReadError = { code?: string | null; message?: string | null } | null;

/**
 * Run a patch_notes query that names its columns: with the name, and again
 * without it where the table has no such column yet.
 *
 * `run` is handed the column list and builds the whole query, so the second
 * try is the same question. It may be a write that reads its row back: one
 * refused for a missing column changed nothing, so asking again is safe.
 * `named` says the table answered with its name column.
 */
export async function withNameColumn<R extends { error: ReadError }>(
  run: (columns: string) => PromiseLike<R>,
): Promise<R & { named: boolean }> {
  const first = await run(PATCH_NOTE_COLUMNS_NAMED);
  if (!isColumnAbsent(first.error)) return { ...first, named: !first.error };
  return { ...(await run(PATCH_NOTE_COLUMNS)), named: false };
}

export type NotesData = {
  entries: Entry[];
  /** True when the live read failed or returned nothing and the committed
      list in data/changelog/entries.json is being shown instead. */
  fromFallback: boolean;
  /** Most recent edit across the live rows. Null on the fallback path. */
  updatedAt: Date | null;
};

export function rowToEntry(r: PatchNoteRow): Entry {
  const name = cleanName(r.name);
  return {
    version: r.version,
    // Left off altogether when there is none, as in the committed file.
    ...(name ? { name } : {}),
    kind: r.kind,
    date: isoToDisplayDate(r.date),
    blurb: r.blurb,
    // Not map(String): a categorised line is an object, and String() on it is
    // "[object Object]" on a reader's screen.
    items: normaliseItems(r.items),
  };
}

export async function getPatchNotes(
  opts: { includeDrafts?: boolean } = {},
): Promise<NotesData> {
  // A patch is handed out with its release's name, from the file as from the table.
  const fallback: NotesData = { entries: withReleaseNames(ENTRIES), fromFallback: true, updatedAt: null };
  try {
    const supa = createAdminClient();
    // Every column, not a named list. This is the read behind each view of
    // /whats-new, and withNameColumn asks twice wherever the table has no
    // name column yet, which is every view until the owner adds it. A star
    // brings the name where it exists and costs one request where it does not.
    let q = supa
      .from("patch_notes")
      .select("*")
      .order("date", { ascending: false })
      .order("version", { ascending: false });
    if (!opts.includeDrafts) q = q.eq("status", "published");
    const { data, error } = await q;
    if (error || !data || data.length === 0) return fallback;

    const rows = data as unknown as PatchNoteRow[];
    let updatedAt: Date | null = null;
    for (const r of rows) {
      const d = new Date(r.updated_at);
      if (!Number.isNaN(d.getTime()) && (!updatedAt || d > updatedAt)) updatedAt = d;
    }
    return {
      entries: withReleaseNames(rows.map(rowToEntry)),
      fromFallback: false,
      updatedAt,
    };
  } catch {
    return fallback;
  }
}
