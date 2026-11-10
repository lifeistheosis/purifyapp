// @capacitor-community/sqlite ContentStore: the device backend. Validated on
// an Android build (a later milestone), not in the node test suite. Everything
// is lazy-imported so neither the web bundle nor the node tests load the plugin
// merely by importing this module.
//
// THE PLUGIN IS NOT INSTALLED since 1.9. The layer has been off since
// 2026-10-12 (lib/content/enabled.ts), and the plugin still put SQLCipher in
// every app: 5.0 MB installed and 2.2 MB of download on an arm64 phone
// (docs/1.9-build/notes/optimization-fable.md, item 6). The code here is kept
// as it was built. The import below names the package through a constant, so
// a build does not look for a package that is not there; it would fail at run
// time, and nothing runs it while the layer is off. To turn the layer on
// again: `npm install @capacitor-community/sqlite`, put the literal import
// back, and restore the SQLCipher keep rules in android/app/proguard-rules.pro
// (git history, the commit that took them out). The store a 1.5 phone filled
// is deleted by the shells themselves now (MainActivity.java, AppDelegate.swift),
// under the file name DEVICE_DB_FILE below.

import type { ContentStore, SqlParams } from "./types";

type CapConn = {
  open(): Promise<void>;
  execute(statements: string): Promise<unknown>;
  run(statement: string, values?: unknown[]): Promise<unknown>;
  query(statement: string, values?: unknown[]): Promise<{ values?: unknown[] }>;
  beginTransaction(): Promise<unknown>;
  commitTransaction(): Promise<unknown>;
  rollbackTransaction(): Promise<unknown>;
  close(): Promise<void>;
};

class CapacitorStore implements ContentStore {
  constructor(private db: CapConn) {}

  async run(sql: string, params?: SqlParams): Promise<void> {
    await this.db.run(sql, params ? [...params] : []);
  }
  async get<T>(sql: string, params?: SqlParams): Promise<T | undefined> {
    const res = await this.db.query(sql, params ? [...params] : []);
    return (res.values?.[0] as T) ?? undefined;
  }
  async all<T>(sql: string, params?: SqlParams): Promise<T[]> {
    const res = await this.db.query(sql, params ? [...params] : []);
    return (res.values as T[]) ?? [];
  }
  async exec(sql: string): Promise<void> {
    await this.db.execute(sql);
  }
  async transaction(fn: (tx: ContentStore) => Promise<void>): Promise<void> {
    await this.db.beginTransaction();
    try {
      await fn(this);
      await this.db.commitTransaction();
    } catch (e) {
      try {
        await this.db.rollbackTransaction();
      } catch {
        /* preserve the original error */
      }
      throw e;
    }
  }
  async close(): Promise<void> {
    await this.db.close();
  }
}

/**
 * Open the device content database. Call once at native startup. The schema is
 * applied by the caller (importPackage / ensureSchema) so this stays a thin
 * connection factory.
 */
/** The database's name, as the plugin is asked for it. */
export const DEVICE_DB_NAME = "purify_content";
/** The file the plugin keeps it in, on both platforms: it adds this ending. */
export const DEVICE_DB_FILE = `${DEVICE_DB_NAME}SQLite.db`;

const SQLITE_PLUGIN = "@capacitor-community/sqlite";

export async function openCapacitorStore(
  dbName = DEVICE_DB_NAME,
): Promise<ContentStore> {
  const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ SQLITE_PLUGIN)) as unknown as {
    CapacitorSQLite: unknown;
    SQLiteConnection: new (plugin: unknown) => {
      createConnection(
        database: string,
        encrypted: boolean,
        mode: string,
        version: number,
        readonly: boolean,
      ): Promise<CapConn>;
    };
  };
  const sqlite = new mod.SQLiteConnection(mod.CapacitorSQLite);
  const conn = await sqlite.createConnection(
    dbName,
    false,
    "no-encryption",
    1,
    false,
  );
  await conn.open();
  return new CapacitorStore(conn);
}
