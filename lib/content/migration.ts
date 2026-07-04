// Existing-beta migration into the local-first store.
//
// Beta users already hold data in localStorage (and, when signed in, in
// Supabase): bookmarks, notes/highlights, reading progress, florilegia. When
// the local-first app first opens we import that into the user_record table so
// nothing is lost. The migration is:
//   - additive + idempotent: re-running imports nothing new and never clobbers
//     a newer local edit (last-writer-wins on updated_at),
//   - non-destructive: it does NOT clear localStorage, so the old data remains
//     as a fallback and a downgrade can't lose it,
//   - scoped to user content only: login/session, Plus entitlement, and
//     settings are owned by Supabase/Preferences and are deliberately untouched.
//
// `synced` defaults to 1 for migrated rows (the beta already synced them via the
// old SyncBridge); pass `enqueue` only for data known to be local-only.

import type { ContentStore } from "./storage/types";
import type { UserRecordKind } from "./schema";
import { META } from "./schema";
import type { SyncQueue } from "./syncQueue";

const MIGRATION_FLAG = "migration_localstorage_v1";

export type MigratedRecord = {
  kind: UserRecordKind;
  /** Stable id — reuse the beta's own id so a later sync upserts, not dupes. */
  id: string;
  data: unknown;
  /** ISO timestamp of the beta record; falls back to epoch if unknown. */
  updatedAt?: string;
};

export type MigrationResult = {
  imported: number;
  skipped: number;
  alreadyDone: boolean;
};

/** Has the localStorage migration already run on this device? */
export async function migrationDone(store: ContentStore): Promise<boolean> {
  const row = await store.get<{ value: string }>(
    "SELECT value FROM meta WHERE key = ?",
    [MIGRATION_FLAG],
  );
  return row?.value === "1";
}

/**
 * Import beta user records. Idempotent and non-destructive. A record is written
 * only if it's absent or strictly newer than what's already local, so running
 * after the user has made fresh local edits never overwrites them.
 */
export async function migrateUserData(
  store: ContentStore,
  records: MigratedRecord[],
  opts: { enqueue?: SyncQueue; markSynced?: boolean } = {},
): Promise<MigrationResult> {
  const alreadyDone = await migrationDone(store);
  let imported = 0;
  let skipped = 0;
  const markSynced = opts.markSynced ?? true;

  for (const rec of records) {
    const updatedAt = rec.updatedAt ?? new Date(0).toISOString();
    const existing = await store.get<{ updated_at: string }>(
      "SELECT updated_at FROM user_record WHERE kind = ? AND id = ?",
      [rec.kind, rec.id],
    );
    // Skip if a same-or-newer local row already exists (last-writer-wins).
    if (existing && existing.updated_at >= updatedAt) {
      skipped++;
      continue;
    }
    await store.run(
      `INSERT INTO user_record (kind, id, json, updated_at, deleted, synced)
       VALUES (?, ?, ?, ?, 0, ?)
       ON CONFLICT(kind, id) DO UPDATE SET
         json = excluded.json, updated_at = excluded.updated_at,
         deleted = 0, synced = excluded.synced`,
      [rec.kind, rec.id, JSON.stringify(rec.data), updatedAt, markSynced ? 1 : 0],
    );
    if (opts.enqueue && !markSynced) {
      await opts.enqueue.saveLocal(rec.kind, rec.id, rec.data);
    }
    imported++;
  }

  await store.run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", [
    MIGRATION_FLAG,
    "1",
  ]);
  // Record when the device last reconciled, for the Settings screen.
  await store.run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", [
    META.lastSyncAt,
    new Date().toISOString(),
  ]);

  return { imported, skipped, alreadyDone };
}
