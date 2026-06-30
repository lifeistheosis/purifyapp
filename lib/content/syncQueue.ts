// Offline-first user data + sync queue.
//
// User edits (bookmarks, notes, highlights, reading progress, florilegia) are
// written to the local DB immediately and never block on the network. Each
// edit also enqueues a mutation; when connectivity returns, `drain` pushes
// queued mutations to Supabase (the cross-device backend is unchanged).
//
// Guarantees:
//   - no lost edits: the local row is written before anything else, and the
//     synced flag is cleared only after a successful push,
//   - no duplicates: queue rows are keyed by "{kind}:{id}" so repeated edits to
//     one record coalesce to a single pending mutation (latest op wins),
//   - stable ids: callers pass a client UUID (newId()); the same id is used
//     locally and remotely so a retried push upserts rather than inserts,
//   - retry with backoff: failed pushes record the error and a next-attempt
//     time; drain skips rows whose backoff hasn't elapsed.

import type { ContentStore } from "./storage/types";
import type { UserRecordKind } from "./schema";

export type SyncOp = "upsert" | "delete";

export type QueueEntry = {
  id: string; // "{kind}:{recordId}"
  kind: UserRecordKind;
  recordId: string;
  op: SyncOp;
  payload: unknown;
  attempts: number;
};

/** Transport for one mutation. Injected (Supabase in the app); throws to fail. */
export type PushFn = (entry: QueueEntry) => Promise<void>;

export type DrainResult = { pushed: number; failed: number; remaining: number };

const BACKOFF_CAP_MS = 30 * 60 * 1000; // 30 min

/** A stable client id for a new user record. */
export function newId(): string {
  return globalThis.crypto.randomUUID();
}

export class SyncQueue {
  constructor(
    private store: ContentStore,
    private now: () => number = () => Date.now(),
  ) {}

  /** Save (create or update) a user record locally and queue it for sync. */
  async saveLocal(
    kind: UserRecordKind,
    recordId: string,
    data: unknown,
  ): Promise<void> {
    const ts = new Date(this.now()).toISOString();
    await this.store.run(
      `INSERT INTO user_record (kind, id, json, updated_at, deleted, synced)
       VALUES (?, ?, ?, ?, 0, 0)
       ON CONFLICT(kind, id) DO UPDATE SET
         json = excluded.json, updated_at = excluded.updated_at,
         deleted = 0, synced = 0`,
      [kind, recordId, JSON.stringify(data), ts],
    );
    await this.enqueue(kind, recordId, "upsert", data);
  }

  /** Tombstone a user record locally and queue the delete. */
  async deleteLocal(kind: UserRecordKind, recordId: string): Promise<void> {
    const ts = new Date(this.now()).toISOString();
    await this.store.run(
      `INSERT INTO user_record (kind, id, json, updated_at, deleted, synced)
       VALUES (?, ?, '{}', ?, 1, 0)
       ON CONFLICT(kind, id) DO UPDATE SET
         updated_at = excluded.updated_at, deleted = 1, synced = 0`,
      [kind, recordId, ts],
    );
    await this.enqueue(kind, recordId, "delete", { id: recordId });
  }

  private async enqueue(
    kind: UserRecordKind,
    recordId: string,
    op: SyncOp,
    payload: unknown,
  ): Promise<void> {
    const ts = new Date(this.now()).toISOString();
    // INSERT OR REPLACE on the "{kind}:{recordId}" PK coalesces repeated edits
    // and lets a later delete supersede a pending upsert — no duplicate pushes.
    await this.store.run(
      `INSERT OR REPLACE INTO sync_queue
         (id, kind, record_id, op, payload, created_at, attempts, last_error, next_attempt_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?)`,
      [`${kind}:${recordId}`, kind, recordId, op, JSON.stringify(payload), ts, ts],
    );
  }

  /** Count of changes waiting to sync (for "N changes waiting to sync"). */
  async pendingCount(): Promise<number> {
    const row = await this.store.get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM sync_queue",
    );
    return row?.n ?? 0;
  }

  /**
   * Push all due mutations. Successful ones clear the local synced flag (or
   * remove the tombstone) and drop the queue row; failures record the error and
   * an exponential backoff. Never throws — returns a summary.
   */
  async drain(push: PushFn): Promise<DrainResult> {
    const nowIso = new Date(this.now()).toISOString();
    const rows = await this.store.all<{
      id: string;
      kind: UserRecordKind;
      record_id: string;
      op: SyncOp;
      payload: string;
      attempts: number;
    }>(
      "SELECT id, kind, record_id, op, payload, attempts FROM sync_queue WHERE next_attempt_at <= ? ORDER BY created_at ASC",
      [nowIso],
    );

    let pushed = 0;
    let failed = 0;
    for (const r of rows) {
      const entry: QueueEntry = {
        id: r.id,
        kind: r.kind,
        recordId: r.record_id,
        op: r.op,
        payload: safeParse(r.payload),
        attempts: r.attempts,
      };
      try {
        await push(entry);
        await this.store.run("DELETE FROM sync_queue WHERE id = ?", [r.id]);
        if (r.op === "delete") {
          await this.store.run(
            "DELETE FROM user_record WHERE kind = ? AND id = ?",
            [r.kind, r.record_id],
          );
        } else {
          await this.store.run(
            "UPDATE user_record SET synced = 1 WHERE kind = ? AND id = ?",
            [r.kind, r.record_id],
          );
        }
        pushed++;
      } catch (e) {
        failed++;
        const attempts = r.attempts + 1;
        const delay = Math.min(BACKOFF_CAP_MS, 1000 * 2 ** attempts);
        const next = new Date(this.now() + delay).toISOString();
        await this.store.run(
          "UPDATE sync_queue SET attempts = ?, last_error = ?, next_attempt_at = ? WHERE id = ?",
          [attempts, String((e as Error)?.message ?? e), next, r.id],
        );
      }
    }
    return { pushed, failed, remaining: await this.pendingCount() };
  }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
