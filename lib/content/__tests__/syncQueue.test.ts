import { describe, it, expect, beforeEach } from "vitest";
import { openNodeStore } from "../storage/nodeStore";
import type { ContentStore } from "../storage/types";
import { ensureSchema } from "../manifest";
import { SyncQueue, type QueueEntry } from "../syncQueue";

describe("SyncQueue (offline-first user data)", () => {
  let store: ContentStore;
  let clock: number;
  let q: SyncQueue;

  beforeEach(async () => {
    store = await openNodeStore();
    await ensureSchema(store);
    clock = Date.parse("2026-06-30T00:00:00Z");
    q = new SyncQueue(store, () => clock);
  });

  it("saves locally and queues one mutation", async () => {
    await q.saveLocal("bookmark", "bm-1", { ref: "john/1" });
    expect(await q.pendingCount()).toBe(1);
    const row = await store.get<{ synced: number; deleted: number }>(
      "SELECT synced, deleted FROM user_record WHERE kind='bookmark' AND id='bm-1'",
    );
    expect(row).toEqual({ synced: 0, deleted: 0 });
  });

  it("coalesces repeated edits to one record (no duplicate pushes)", async () => {
    await q.saveLocal("note", "n-1", { text: "first" });
    await q.saveLocal("note", "n-1", { text: "second" });
    await q.saveLocal("note", "n-1", { text: "third" });
    expect(await q.pendingCount()).toBe(1);
  });

  it("a delete supersedes a pending upsert", async () => {
    await q.saveLocal("highlight", "h-1", { color: "gold" });
    await q.deleteLocal("highlight", "h-1");
    expect(await q.pendingCount()).toBe(1);
    const entry = await store.get<{ op: string }>(
      "SELECT op FROM sync_queue WHERE id='highlight:h-1'",
    );
    expect(entry?.op).toBe("delete");
  });

  it("drains successfully: clears the queue and marks synced", async () => {
    await q.saveLocal("bookmark", "bm-1", { ref: "john/1" });
    const pushed: QueueEntry[] = [];
    const res = await q.drain(async (e) => {
      pushed.push(e);
    });
    expect(res.pushed).toBe(1);
    expect(res.remaining).toBe(0);
    expect(pushed[0].recordId).toBe("bm-1");
    const row = await store.get<{ synced: number }>(
      "SELECT synced FROM user_record WHERE id='bm-1'",
    );
    expect(row?.synced).toBe(1);
  });

  it("removes the local row when a delete syncs", async () => {
    await q.saveLocal("bookmark", "bm-1", {});
    await q.drain(async () => {});
    await q.deleteLocal("bookmark", "bm-1");
    await q.drain(async () => {});
    const row = await store.get("SELECT 1 FROM user_record WHERE id='bm-1'");
    expect(row).toBeUndefined();
    expect(await q.pendingCount()).toBe(0);
  });

  it("retries with backoff on failure and loses nothing", async () => {
    await q.saveLocal("note", "n-1", { text: "keep me" });
    const res = await q.drain(async () => {
      throw new Error("network down");
    });
    expect(res.pushed).toBe(0);
    expect(res.failed).toBe(1);
    expect(await q.pendingCount()).toBe(1); // still queued, not lost

    const row = await store.get<{ attempts: number; last_error: string }>(
      "SELECT attempts, last_error FROM sync_queue WHERE id='note:n-1'",
    );
    expect(row?.attempts).toBe(1);
    expect(row?.last_error).toMatch(/network down/);

    // Backoff: a drain at the same instant skips the not-yet-due row.
    const again = await q.drain(async () => {});
    expect(again.pushed).toBe(0);

    // After the backoff window, it pushes.
    clock += 60 * 60 * 1000;
    const recovered = await q.drain(async () => {});
    expect(recovered.pushed).toBe(1);
  });
});
