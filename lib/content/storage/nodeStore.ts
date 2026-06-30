// node:sqlite ContentStore — used by the unit tests and the build-time content
// packager. Node 22.5+/24 ships node:sqlite (DatabaseSync), so this needs no
// native build and no extra dependency. NOT shipped to the device (the WebView
// has no node:sqlite); the Capacitor adapter covers that.
//
// Imported lazily so this module never enters the browser bundle.

import type { ContentStore, SqlParams } from "./types";

type SyncDb = {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  close(): void;
};

function toArgs(params?: SqlParams): unknown[] {
  return params ? [...params] : [];
}

class NodeStore implements ContentStore {
  constructor(private db: SyncDb) {}

  async run(sql: string, params?: SqlParams): Promise<void> {
    this.db.prepare(sql).run(...toArgs(params));
  }
  async get<T>(sql: string, params?: SqlParams): Promise<T | undefined> {
    return (this.db.prepare(sql).get(...toArgs(params)) as T) ?? undefined;
  }
  async all<T>(sql: string, params?: SqlParams): Promise<T[]> {
    return this.db.prepare(sql).all(...toArgs(params)) as T[];
  }
  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }
  async transaction(fn: (tx: ContentStore) => Promise<void>): Promise<void> {
    this.db.exec("BEGIN");
    try {
      await fn(this);
      this.db.exec("COMMIT");
    } catch (e) {
      // Roll back so an interrupted import never leaves the DB half-applied.
      try {
        this.db.exec("ROLLBACK");
      } catch {
        /* a failed rollback shouldn't mask the original error */
      }
      throw e;
    }
  }
  async close(): Promise<void> {
    this.db.close();
  }
}

/** Open a node:sqlite-backed store. `:memory:` for tests, a path for the packager. */
export async function openNodeStore(filename = ":memory:"): Promise<ContentStore> {
  // `node:sqlite` ships no type declarations in @types/node yet; a non-literal
  // specifier keeps TS from trying (and failing) to resolve it.
  const mod = (await import("node:sqlite" as string)) as {
    DatabaseSync: new (path: string) => SyncDb;
  };
  const { DatabaseSync } = mod;
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA journal_mode = WAL;");
  return new NodeStore(db);
}
