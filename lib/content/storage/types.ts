// Storage adapter contract. Everything above this line (repository, manifest
// import, sync queue) talks only to ContentStore, so the same logic runs on
// node:sqlite (tests + packager) and @capacitor-community/sqlite (device)
// without per-backend branches.
//
// The API is async because the device backend is async; the node adapter just
// resolves immediately.

export type SqlParams = ReadonlyArray<string | number | null>;

export interface ContentStore {
  /** Run a statement that returns nothing (INSERT/UPDATE/DELETE/DDL). */
  run(sql: string, params?: SqlParams): Promise<void>;
  /** First matching row, or undefined. */
  get<T = Record<string, unknown>>(
    sql: string,
    params?: SqlParams,
  ): Promise<T | undefined>;
  /** All matching rows. */
  all<T = Record<string, unknown>>(
    sql: string,
    params?: SqlParams,
  ): Promise<T[]>;
  /** Run a multi-statement script (e.g. the schema DDL). */
  exec(sql: string): Promise<void>;
  /**
   * Run `fn` inside a single transaction. Commits on resolve, rolls back on
   * throw — the basis of transactional package import (never half-applied).
   */
  transaction(fn: (tx: ContentStore) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

/** A blob/file store for downloaded images + content packages (Capacitor
 *  Filesystem on device, a temp dir in tests). Kept separate from the row
 *  store so large binaries never land in SQLite or localStorage. */
export interface FileStore {
  read(path: string): Promise<Uint8Array | null>;
  write(path: string, data: Uint8Array): Promise<void>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
  /** Total bytes used under the store root (for the Settings storage screen). */
  size(): Promise<number>;
}
