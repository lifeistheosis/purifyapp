"use client";

/**
 * What this device took away, remembered until the server has heard it.
 *
 * WHY THIS EXISTS (1.7, the owner's note 21, "swipe to remove"). The bookmark
 * and annotation syncs only ever inserted, and every (app) page pulled the
 * server's rows back on mount, so for a signed-in reader a removed verse came
 * back on the next page and a cleared highlight came back with it. A swipe
 * that does not stick is worse than no swipe.
 *
 * A removal leaves a tombstone here: which table, which kind, which locator,
 * and when. The next push deletes the matching server row and marks the
 * tombstone flushed; the pull skips any server row the tombstone is newer
 * than. A flushed tombstone is kept for thirty days, because another device
 * that still holds the thing pushes it back with its old date, and this
 * device should not take it again. Adding the same thing back drops the
 * tombstone at once.
 *
 * Storage: purify:sync:removed = Tombstone[] (JSON).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type SyncTable = "bookmarks" | "annotations";

export type Tombstone = {
  table: SyncTable;
  kind: string;
  locator: Record<string, string | number>;
  /** When it was removed here (ISO). */
  at: string;
  /** The server row is gone: kept only so a pull does not take it back. */
  flushed?: boolean;
};

const KEY = "purify:sync:removed";
/** How long a flushed tombstone is kept. */
const KEEP_MS = 30 * 86_400_000;

/**
 * Order-independent key for a (kind, locator) pair: the local locator and the
 * server's jsonb can carry the same fields in a different order.
 */
export function canonicalKey(kind: string, loc: Record<string, unknown>): string {
  const sorted = Object.keys(loc)
    .sort()
    .map((k) => `${k}:${String(loc[k])}`)
    .join("|");
  return `${kind}|${sorted}`;
}

export function readTombstones(): Tombstone[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as Tombstone[]).filter((t) => t && typeof t.kind === "string" && t.locator) : [];
  } catch {
    return [];
  }
}

function writeTombstones(list: Tombstone[]): void {
  try {
    if (list.length) window.localStorage.setItem(KEY, JSON.stringify(list));
    else window.localStorage.removeItem(KEY);
  } catch {
    /* storage shut: the removal simply is not remembered for the server */
  }
}

const same = (t: Tombstone, table: SyncTable, key: string) => t.table === table && canonicalKey(t.kind, t.locator) === key;

/** Remember that this device took `kind`/`locator` away from `table`. */
export function addTombstone(
  table: SyncTable,
  kind: string,
  locator: Record<string, string | number>,
  at: string = new Date().toISOString(),
): void {
  const key = canonicalKey(kind, locator);
  const rest = readTombstones().filter((t) => !same(t, table, key));
  writeTombstones([...rest, { table, kind, locator, at }]);
}

/** It is back on this device: forget that it was taken away. */
export function dropTombstone(table: SyncTable, kind: string, locator: Record<string, unknown>): void {
  const key = canonicalKey(kind, locator);
  const list = readTombstones();
  const rest = list.filter((t) => !same(t, table, key));
  if (rest.length !== list.length) writeTombstones(rest);
}

/** Every tombstone of a table by canonical key, to the time of removal. */
export function tombstoneIndex(table: SyncTable): Map<string, string> {
  const out = new Map<string, string>();
  for (const t of readTombstones()) if (t.table === table) out.set(canonicalKey(t.kind, t.locator), t.at);
  return out;
}

/**
 * Whether a server row is one this device has taken away since the row last
 * changed. A row with no date of its own counts as older.
 */
export function buried(index: Map<string, string>, key: string, rowAt: string | null | undefined): boolean {
  const at = index.get(key);
  if (!at) return false;
  if (!rowAt) return true;
  return Date.parse(at) >= Date.parse(rowAt);
}

/**
 * Delete the server rows this device has taken away, and mark each one sent.
 * A failure leaves its tombstone for the next push. Old flushed ones go.
 */
export async function flushTombstones(supabase: SupabaseClient, table: SyncTable, userId: string, now = Date.now()): Promise<void> {
  const list = readTombstones();
  let changed = false;
  for (const t of list) {
    if (t.table !== table || t.flushed) continue;
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("user_id", userId)
        .eq("kind", t.kind)
        .contains("locator", t.locator);
      if (!error) {
        t.flushed = true;
        changed = true;
      }
    } catch {
      /* offline: the next push tries again */
    }
  }
  const kept = list.filter((t) => !(t.flushed && now - Date.parse(t.at) > KEEP_MS));
  if (changed || kept.length !== list.length) {
    // Re-read before writing: a removal made while the deletes were in flight
    // must not be lost to this write.
    const latest = readTombstones();
    const sent = new Set(list.filter((t) => t.flushed).map((t) => `${t.table}|${canonicalKey(t.kind, t.locator)}|${t.at}`));
    const merged = latest
      .map((t) => (sent.has(`${t.table}|${canonicalKey(t.kind, t.locator)}|${t.at}`) ? { ...t, flushed: true } : t))
      .filter((t) => !(t.flushed && now - Date.parse(t.at) > KEEP_MS));
    writeTombstones(merged);
  }
}
