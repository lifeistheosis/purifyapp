"use client";

import { createClient } from "@/lib/supabase/client";
import { canSync } from "@/lib/entitlements/client";
import type {
  Florilegium,
  FlorilegiumItem,
} from "@/lib/florilegium/florilegium";

/**
 * Two-way, eventually-consistent sync of the reader's florilegia between
 * localStorage (purify:florilegia) and the public.florilegia /
 * public.florilegium_items tables. Same discipline as lib/sync/bookmarks:
 * local is always the source of truth on the device, so a network failure
 * never breaks the UI; the client-generated UUIDs are the shared identity,
 * which makes every upsert idempotent.
 *
 * Entitlement note: cross-device sync is part of the Purify Plus layer
 * (Plus or pre-launch supporter). While ENTITLEMENTS_ENFORCED is false
 * this runs for any signed-in user, exactly like bookmark/annotation sync
 * does today. When enforcement flips at v10, all three sync modules gate
 * on entitlements.sync in one change; this module is written to slot into
 * that without restructuring.
 *
 * Merge is a union by id: server rows missing locally are added; local
 * rows are pushed up. Like bookmarks, a delete on one device does not yet
 * propagate (the row returns from the other side on next pull); collection
 * delete is therefore a local action until a tombstone pass is added.
 */

const STORAGE_KEY = "purify:florilegia";
const EVENT = "purify:florilegium";

function readLocal(): Florilegium[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Florilegium[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: Florilegium[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { items } }));
  } catch {
    /* ignore */
  }
}

// Split an item into the (kind, note) columns and the jsonb payload (every
// kind-specific field). Reconstructed verbatim on pull.
function itemPayload(item: FlorilegiumItem): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, addedAt, note, kind, ...rest } = item;
  return rest;
}

/** Push every local florilegium + its items to the server (idempotent
 * upsert on the shared UUIDs). Silent on auth/network errors. */
export async function pushAllLocalFlorilegia() {
  try {
    // Cross-device sync is part of the Purify Plus layer. Native-aware:
    // open on web + native until enforcement flips, then Plus-only.
    if (!(await canSync())) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const local = readLocal();
    if (local.length === 0) return;

    const parentRows = local.map((f) => ({
      id: f.id,
      user_id: user.id,
      title: f.title,
      description: f.description ?? null,
      created_at: new Date(f.createdAt).toISOString(),
      updated_at: new Date(f.updatedAt).toISOString(),
    }));
    await supabase.from("florilegia").upsert(parentRows);

    const itemRows = local.flatMap((f) =>
      f.items.map((it) => ({
        id: it.id,
        florilegium_id: f.id,
        user_id: user.id,
        kind: it.kind,
        payload: itemPayload(it),
        note: it.note ?? null,
        added_at: new Date(it.addedAt).toISOString(),
      })),
    );
    if (itemRows.length > 0) {
      await supabase.from("florilegium_items").upsert(itemRows);
    }
  } catch {
    /* swallow */
  }
}

/** Pull every server florilegium + item and union-merge into local. */
export async function pullServerFlorilegia() {
  try {
    if (!(await canSync())) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: parents, error: pErr }, { data: items, error: iErr }] =
      await Promise.all([
        supabase
          .from("florilegia")
          .select("id, title, description, created_at, updated_at")
          .order("updated_at", { ascending: false }),
        supabase
          .from("florilegium_items")
          .select("id, florilegium_id, kind, payload, note, added_at")
          .order("added_at", { ascending: false }),
      ]);
    if (pErr || iErr || !parents) return;

    const local = readLocal();
    const localById = new Map(local.map((f) => [f.id, f]));

    // Group server items by their parent collection.
    const itemsByParent = new Map<string, FlorilegiumItem[]>();
    for (const row of items ?? []) {
      const payload = (row.payload as Record<string, unknown>) ?? {};
      const reconstructed = {
        id: row.id as string,
        addedAt: new Date(row.added_at as string).getTime(),
        note: (row.note as string | null) ?? undefined,
        kind: row.kind as FlorilegiumItem["kind"],
        ...payload,
      } as FlorilegiumItem;
      const pid = row.florilegium_id as string;
      if (!itemsByParent.has(pid)) itemsByParent.set(pid, []);
      itemsByParent.get(pid)!.push(reconstructed);
    }

    const merged: Florilegium[] = [...local];
    for (const p of parents) {
      const pid = p.id as string;
      const serverItems = itemsByParent.get(pid) ?? [];
      const existing = localById.get(pid);
      if (!existing) {
        // A collection from another device: add it whole.
        merged.push({
          id: pid,
          title: p.title as string,
          description: (p.description as string | null) ?? undefined,
          createdAt: new Date(p.created_at as string).getTime(),
          updatedAt: new Date(p.updated_at as string).getTime(),
          items: serverItems,
        });
        continue;
      }
      // Collection exists locally: union its items by id.
      const haveIds = new Set(existing.items.map((i) => i.id));
      const additions = serverItems.filter((i) => !haveIds.has(i.id));
      if (additions.length > 0) {
        existing.items = [...existing.items, ...additions].sort(
          (a, b) => b.addedAt - a.addedAt,
        );
      }
    }

    writeLocal(merged);
  } catch {
    /* swallow */
  }
}

/** Two-way sync. Call on sign-in and from a manual "Sync now". */
export async function syncFlorilegia() {
  await pushAllLocalFlorilegia();
  await pullServerFlorilegia();
}
