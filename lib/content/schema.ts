// Local-first content database — schema + shared types.
//
// One SQLite database backs the offline Android app: read-only "content"
// tables imported from a versioned starter/update package, plus read-write
// "user data" tables (bookmarks, notes, highlights, reading progress,
// florilegia) that mirror to Supabase through the offline sync queue.
//
// The same schema runs on three backends behind the ContentStore adapter:
// node:sqlite (tests + the build-time packager) and @capacitor-community/sqlite
// (device). Keep the DDL portable — no engine-specific features (FTS5 is not
// guaranteed on every backend, so search uses a plain indexed table + LIKE,
// which is plenty for a bounded offline corpus; a true FTS index can land
// later without changing the repository contract).

/** Bumped only when the table shape changes (triggers a migrating re-import). */
export const SCHEMA_VERSION = 1;

/** Content categories carried in the package + search index. */
export type ContentType =
  | "bible_chapter"
  | "prayer"
  | "saint"
  | "saint_writing"
  | "council"
  | "theology"
  | "topic"
  | "heresy"
  | "apologetics"
  | "feast";

export const CONTENT_TYPES: readonly ContentType[] = [
  "bible_chapter",
  "prayer",
  "saint",
  "saint_writing",
  "council",
  "theology",
  "topic",
  "heresy",
  "apologetics",
  "feast",
];

/** A row in any content table: identity + display fields + the full record
 *  JSON. We keep the original record verbatim in `json` so the reader renders
 *  exactly what the website serves; columns exist only for lookup/sort. */
export type ContentRecord = {
  type: ContentType;
  /** Stable id within the type. Composite ids use a stable string form, e.g.
   *  a bible chapter is "john/1", a saint writing is "{saint}/{work}". */
  ref_id: string;
  title: string;
  /** Optional secondary key used by date/range lookups (e.g. feast "MM-DD",
   *  bible book slug, saint slug for a writing). */
  key: string | null;
  /** The verbatim content record, JSON-encoded. */
  json: string;
};

/** User-generated record. Stable client UUID, tombstone + sync flags so the
 *  queue can reconcile without losing local edits or creating duplicates. */
export type UserRecordKind =
  | "bookmark"
  | "note"
  | "highlight"
  | "reading_progress"
  | "florilegium"
  | "florilegium_item";

// One unbroken DDL string, run on first open / migrating import. Every table
// is IF NOT EXISTS so re-opening an existing device DB is a no-op.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Read-only content, imported from the package.
CREATE TABLE IF NOT EXISTS content (
  type    TEXT NOT NULL,
  ref_id  TEXT NOT NULL,
  title   TEXT NOT NULL,
  key     TEXT,
  json    TEXT NOT NULL,
  PRIMARY KEY (type, ref_id)
);
CREATE INDEX IF NOT EXISTS idx_content_type_key ON content (type, key);

-- Flat search index (type + ref_id + lowercased title/body). LIKE-scored.
CREATE TABLE IF NOT EXISTS search_index (
  type   TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  title  TEXT NOT NULL,
  body   TEXT NOT NULL,
  PRIMARY KEY (type, ref_id)
);

-- Which optional content packages/items are present on this device.
CREATE TABLE IF NOT EXISTS downloaded_content (
  content_id    TEXT PRIMARY KEY,
  status        TEXT NOT NULL,            -- 'installed' | 'pending' | 'failed'
  version       TEXT,
  bytes         INTEGER NOT NULL DEFAULT 0,
  downloaded_at TEXT
);

-- User data. updated_at drives last-writer-wins; deleted is a tombstone so a
-- removal still syncs; synced=0 means a pending change the queue must push.
CREATE TABLE IF NOT EXISTS user_record (
  kind       TEXT NOT NULL,
  id         TEXT NOT NULL,              -- stable client UUID
  json       TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted    INTEGER NOT NULL DEFAULT 0,
  synced     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, id)
);
CREATE INDEX IF NOT EXISTS idx_user_record_unsynced ON user_record (synced);

-- Offline write queue. One row per pending mutation; coalesced by (kind,id).
CREATE TABLE IF NOT EXISTS sync_queue (
  id           TEXT PRIMARY KEY,         -- "{kind}:{recordId}" (coalesce key)
  kind         TEXT NOT NULL,
  record_id    TEXT NOT NULL,
  op           TEXT NOT NULL,            -- 'upsert' | 'delete'
  payload      TEXT NOT NULL,
  created_at   TEXT NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_error   TEXT,
  next_attempt_at TEXT NOT NULL
);
`;

/** Meta keys (kept in one place so the manifest/import and repository agree). */
export const META = {
  schemaVersion: "schema_version",
  contentVersion: "content_version",
  lastUpdateAt: "last_update_at",
  lastSyncAt: "last_sync_at",
} as const;
