import { describe, it, expect, beforeEach } from "vitest";
import { openNodeStore } from "../storage/nodeStore";
import type { ContentStore } from "../storage/types";
import { ensureSchema } from "../manifest";
import { migrateUserData, migrationDone, type MigratedRecord } from "../migration";
import { SyncQueue } from "../syncQueue";

const BETA: MigratedRecord[] = [
  { kind: "bookmark", id: "bm-1", data: { ref: "john/1" }, updatedAt: "2026-01-01T00:00:00Z" },
  { kind: "note", id: "n-1", data: { text: "old note" }, updatedAt: "2026-01-01T00:00:00Z" },
];

describe("existing-user migration", () => {
  let store: ContentStore;
  beforeEach(async () => {
    store = await openNodeStore();
    await ensureSchema(store);
  });

  it("imports beta records and marks the migration done", async () => {
    const res = await migrateUserData(store, BETA);
    expect(res.imported).toBe(2);
    expect(await migrationDone(store)).toBe(true);
    const row = await store.get<{ json: string }>(
      "SELECT json FROM user_record WHERE id='bm-1'",
    );
    expect(JSON.parse(row!.json).ref).toBe("john/1");
  });

  it("is idempotent: a second run imports nothing", async () => {
    await migrateUserData(store, BETA);
    const res2 = await migrateUserData(store, BETA);
    expect(res2.imported).toBe(0);
    expect(res2.skipped).toBe(2);
    expect(res2.alreadyDone).toBe(true);
  });

  it("never clobbers a newer local edit (last-writer-wins)", async () => {
    const q = new SyncQueue(store);
    await q.saveLocal("note", "n-1", { text: "fresh local edit" }); // now-ish, newest
    const res = await migrateUserData(store, BETA); // older beta note
    expect(res.skipped).toBeGreaterThanOrEqual(1);
    const row = await store.get<{ json: string }>(
      "SELECT json FROM user_record WHERE id='n-1'",
    );
    expect(JSON.parse(row!.json).text).toBe("fresh local edit");
  });

  it("marks migrated rows synced by default (no spurious queue entries)", async () => {
    await migrateUserData(store, BETA);
    const q = new SyncQueue(store);
    expect(await q.pendingCount()).toBe(0);
    const unsynced = await store.get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM user_record WHERE synced=0",
    );
    expect(unsynced?.n).toBe(0);
  });

  it("can enqueue local-only data for upload when asked", async () => {
    const q = new SyncQueue(store);
    const res = await migrateUserData(store, BETA, { enqueue: q, markSynced: false });
    expect(res.imported).toBe(2);
    expect(await q.pendingCount()).toBe(2);
  });
});
