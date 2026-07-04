// @capacitor-community/sqlite ContentStore — the device backend. Validated on
// an Android build (a later milestone), not in the node test suite. Everything
// is lazy-imported so neither the web bundle nor the node tests load the plugin
// merely by importing this module.

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
export async function openCapacitorStore(
  dbName = "purify_content",
): Promise<ContentStore> {
  const mod = (await import("@capacitor-community/sqlite")) as unknown as {
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
