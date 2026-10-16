"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { pageAllSettled } from "@/lib/supabase/pageAll";
import { canSync } from "@/lib/entitlements/client";
import { buried, canonicalKey, flushTombstones, tombstoneIndex } from "@/lib/sync/tombstones";

/**
 * Best-effort sync of verse and saint-paragraph annotations between
 * localStorage and the public.annotations table.
 *
 * Local keys:
 *   purify:bible:{book}:{chapter}:{verse}
 *   purify:saint:{saintSlug}:{workSlug}:{sectionN}:{paragraphIdx}
 *
 * Same shape on the server (locator jsonb captures the variant fields).
 *
 * 1.7: edits and removals reach the server. Until then the push only ever
 * inserted, so an edited note never left the device, and the pull on every
 * (app) page wrote the server's first copy back over it; a cleared highlight
 * came back the same way, and every highlight came back yellow because the
 * table has no colour column. Now:
 *  - a change is pushed for its own key: update the row, insert it if there
 *    is none (the locator index is an expression, so PostgREST cannot upsert
 *    on it);
 *  - a verse cleared of everything leaves a tombstone, and the push deletes
 *    the row (lib/sync/tombstones.ts);
 *  - every value carries `at`, when it last changed here, and the pull keeps
 *    the local value when it is as new as the row or newer;
 *  - the pull never drops a colour the device has when the row has none;
 *  - `color` is sent and read only once a probe has found the column, which
 *    is the owner's SQL (docs/1.7-build/sql/annotation-color-and-journal.sql).
 *    Asking for a column the table lacks fails the whole request, so before
 *    that SQL runs a highlight's colour stays on the device that chose it.
 */

type Kind = "bible-verse" | "saint-paragraph";

type LocalValue = {
  highlighted?: boolean;
  highlightedWords?: number[];
  color?: string;
  note?: string;
  noteAt?: string;
  at?: string;
  hlAt?: string;
};

type ServerRow = {
  kind: string;
  locator: Record<string, unknown>;
  highlighted?: boolean | null;
  highlighted_words?: number[] | null;
  note?: string | null;
  color?: string | null;
  updated_at: string;
};

/** Marks a write made by the pull, so SyncBridge does not push it back. */
export const FROM_SYNC = "sync";

function parseLocalKey(k: string): { kind: Kind; locator: Record<string, string | number> } | null {
  if (k.startsWith("purify:bible:")) {
    const [, , book, chapter, verse] = k.split(":");
    if (!book || !chapter || !verse) return null;
    return {
      kind: "bible-verse",
      locator: { book, chapter: Number(chapter), verse: Number(verse) },
    };
  }
  if (k.startsWith("purify:saint:")) {
    const [, , saintSlug, workSlug, sectionN, paragraphIdx] = k.split(":");
    if (!saintSlug || !workSlug || !sectionN || paragraphIdx === undefined)
      return null;
    return {
      kind: "saint-paragraph",
      locator: {
        saintSlug,
        workSlug,
        sectionN: Number(sectionN),
        paragraphIdx: Number(paragraphIdx),
      },
    };
  }
  return null;
}

function keyForRow(row: { kind: string; locator: Record<string, unknown> }) {
  if (row.kind === "bible-verse") {
    return `purify:bible:${row.locator.book}:${row.locator.chapter}:${row.locator.verse}`;
  }
  return `purify:saint:${row.locator.saintSlug}:${row.locator.workSlug}:${row.locator.sectionN}:${row.locator.paragraphIdx}`;
}

/**
 * The local key a `purify:annotation` event is about, or null when the event
 * names nothing (an import, a clear) and only a full sweep will do.
 */
export function annotationKeyOf(detail: unknown): string | null {
  if (!detail || typeof detail !== "object") return null;
  const d = detail as Record<string, unknown>;
  if (d.kind === "saint-paragraph" && d.saintSlug && d.workSlug && d.sectionN !== undefined && d.paragraphIdx !== undefined) {
    return `purify:saint:${d.saintSlug}:${d.workSlug}:${d.sectionN}:${d.paragraphIdx}`;
  }
  if (typeof d.book === "string" && d.chapter !== undefined && d.verse !== undefined) {
    return `purify:bible:${d.book}:${d.chapter}:${d.verse}`;
  }
  return null;
}

function readLocalValue(k: string): LocalValue | null {
  try {
    const raw = window.localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as LocalValue) : null;
  } catch {
    return null;
  }
}

const hasContent = (v: LocalValue | null): v is LocalValue =>
  !!v && (!!v.highlighted || (typeof v.note === "string" && v.note.trim().length > 0) || (Array.isArray(v.highlightedWords) && v.highlightedWords.length > 0));

// ── Whether the table has a colour column ────────────────────────────────

const COLOR_KEY = "purify:sync:annotationColor";
/** A missing column is asked about again after this long. */
const REPROBE_MS = 12 * 3_600_000;
let colorKnown: boolean | null = null;

function isMissingColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return error.code === "42703" || error.code === "PGRST204" || (/column/i.test(message) && /color/i.test(message));
}

function rememberColor(ok: boolean) {
  colorKnown = ok;
  try {
    window.localStorage.setItem(COLOR_KEY, JSON.stringify({ ok, at: Date.now() }));
  } catch {
    /* kept for this page only */
  }
}

/** True once the server is known to keep a highlight's colour. */
export async function annotationColorColumn(supabase: SupabaseClient): Promise<boolean> {
  if (colorKnown !== null) return colorKnown;
  try {
    const saved = JSON.parse(window.localStorage.getItem(COLOR_KEY) ?? "null") as { ok: boolean; at: number } | null;
    if (saved && (saved.ok || Date.now() - saved.at < REPROBE_MS)) {
      colorKnown = saved.ok;
      return saved.ok;
    }
  } catch {
    /* ask */
  }
  try {
    const { error } = await supabase.from("annotations").select("color").limit(1);
    if (!error) {
      rememberColor(true);
      return true;
    }
    if (isMissingColumn(error)) rememberColor(false);
    return false;
  } catch {
    return false;
  }
}

/** For tests: forget what the probe found. */
export function forgetColorProbe() {
  colorKnown = null;
}

function rowFields(v: LocalValue, withColor: boolean) {
  return {
    highlighted: !!v.highlighted,
    highlighted_words: Array.isArray(v.highlightedWords) && v.highlightedWords.length > 0 ? v.highlightedWords : null,
    note: typeof v.note === "string" && v.note.trim().length > 0 ? v.note : null,
    updated_at: v.at ?? new Date().toISOString(),
    ...(withColor ? { color: v.color ?? null } : {}),
  };
}

async function signedIn(): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  // Cross-device sync is part of the Purify Plus layer (see
  // lib/entitlements/client). Open on web + native until enforced.
  if (!(await canSync())) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, userId: user.id } : null;
}

/** Update the row for one key, or insert it when the server has none. */
async function writeOne(
  supabase: SupabaseClient,
  userId: string,
  parsed: { kind: Kind; locator: Record<string, string | number> },
  v: LocalValue,
  withColor: boolean,
): Promise<void> {
  let fields: Record<string, unknown> = rowFields(v, withColor);
  let { data, error } = await supabase
    .from("annotations")
    .update(fields)
    .eq("user_id", userId)
    .eq("kind", parsed.kind)
    .contains("locator", parsed.locator)
    .select("id");
  if (error && withColor && isMissingColumn(error)) {
    // The column went away, or the probe was wrong: never fail the push on it.
    rememberColor(false);
    fields = rowFields(v, false);
    ({ data, error } = await supabase
      .from("annotations")
      .update(fields)
      .eq("user_id", userId)
      .eq("kind", parsed.kind)
      .contains("locator", parsed.locator)
      .select("id"));
  }
  if (error) return;
  if ((data?.length ?? 0) === 0) {
    await supabase.from("annotations").insert({ user_id: userId, kind: parsed.kind, locator: parsed.locator, ...fields });
  }
}

/**
 * Push what changed on these keys: removals first (the tombstones), then each
 * key's current value. What SyncBridge calls after a highlight, a note, a
 * swipe on Saved.
 */
export async function pushAnnotationKeys(keys: Iterable<string>) {
  try {
    const session = await signedIn();
    if (!session) return;
    const { supabase, userId } = session;
    await flushTombstones(supabase, "annotations", userId);
    const withColor = await annotationColorColumn(supabase);
    for (const k of new Set(keys)) {
      const parsed = parseLocalKey(k);
      const v = readLocalValue(k);
      if (!parsed || !hasContent(v)) continue;
      await writeOne(supabase, userId, parsed, v, withColor);
    }
  } catch {
    /* swallow */
  }
}

function snapshotLocal(): { key: string; kind: Kind; locator: Record<string, string | number>; value: LocalValue }[] {
  const rows: { key: string; kind: Kind; locator: Record<string, string | number>; value: LocalValue }[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (!k) continue;
    const parsed = parseLocalKey(k);
    if (!parsed) continue;
    const v = readLocalValue(k);
    if (!hasContent(v)) continue;
    rows.push({ key: k, ...parsed, value: v });
  }
  return rows;
}

/**
 * The sweep: removals, then every local annotation the server does not have
 * yet (ON CONFLICT DO NOTHING against the locator index). Dated by the local
 * change, so the pull that follows sees the two as the same age.
 */
export async function pushAllLocalAnnotations() {
  try {
    const session = await signedIn();
    if (!session) return;
    const { supabase, userId } = session;
    await flushTombstones(supabase, "annotations", userId);
    const withColor = await annotationColorColumn(supabase);
    const rows = snapshotLocal().map((r) => ({ user_id: userId, kind: r.kind, locator: r.locator, ...rowFields(r.value, withColor) }));
    // Chunk into batches of 100 so a large local store doesn't bust a single
    // upsert payload.
    for (let i = 0; i < rows.length; i += 100) {
      await supabase.from("annotations").upsert(rows.slice(i, i + 100), { ignoreDuplicates: true });
    }
  } catch {
    /* swallow */
  }
}

/**
 * Pull every server row and merge it into the device. A row this device
 * removed since it last changed is skipped; a local value as new as the row
 * or newer is kept; a colour the row lacks is kept from the device. Returns
 * each server row's time by local key, so a sync can push what is newer here.
 */
export async function pullServerAnnotations(): Promise<Map<string, string>> {
  const seen = new Map<string, string>();
  try {
    const session = await signedIn();
    if (!session) return seen;
    const { supabase } = session;
    const withColor = await annotationColorColumn(supabase);
    // Every note and highlight, in pages. This read named no limit, and one
    // request stops at 1,000 rows without an error: a reader with more than
    // that who signed in on a new phone would have found some of them there
    // and the rest missing, though all of them were safe on the server.
    const { data, error } = await pageAllSettled<ServerRow>((from, to) =>
      supabase
        .from("annotations")
        .select(`kind, locator, highlighted, highlighted_words, note, updated_at${withColor ? ", color" : ""}`)
        .order("id")
        .range(from, to) as unknown as PromiseLike<{ data: ServerRow[] | null; error: { message: string } | null }>,
    );
    if (error || !data) return seen;
    const removed = tombstoneIndex("annotations");
    for (const row of data) {
      if (row.kind !== "bible-verse" && row.kind !== "saint-paragraph") continue;
      const k = keyForRow(row);
      seen.set(k, row.updated_at);
      if (buried(removed, canonicalKey(row.kind, row.locator ?? {}), row.updated_at)) continue;
      const local = readLocalValue(k);
      // Changed here since the server last heard: the device's copy stands,
      // and the sync pushes it.
      if (local?.at && row.updated_at && Date.parse(local.at) >= Date.parse(row.updated_at)) continue;
      const value: LocalValue = {};
      if (row.highlighted) value.highlighted = true;
      if (Array.isArray(row.highlighted_words) && row.highlighted_words.length)
        value.highlightedWords = row.highlighted_words as number[];
      if (typeof row.note === "string" && row.note.trim().length) {
        value.note = row.note;
        // The journal's date for a note (lib/bible/journal.ts): this device's
        // own when it has one, else the day the server last saw it change.
        value.noteAt = local?.noteAt ?? row.updated_at;
      }
      if (Object.keys(value).length === 0) continue;
      // The server's colour when it keeps one; else the one this device chose.
      const color = (typeof row.color === "string" && row.color) || local?.color;
      if (color) value.color = color;
      if (row.updated_at) value.at = row.updated_at;
      // When this device first saw it highlighted, while it still is.
      if (local?.hlAt && (value.highlighted || value.highlightedWords)) value.hlAt = local.hlAt;
      try {
        window.localStorage.setItem(k, JSON.stringify(value));
        // Nudge any mounted hook for this key, marked as the sync's own write.
        const parts = k.split(":");
        if (parts[1] === "bible") {
          window.dispatchEvent(
            new CustomEvent("purify:annotation", {
              detail: {
                book: parts[2],
                chapter: Number(parts[3]),
                verse: Number(parts[4]),
                data: value,
                source: FROM_SYNC,
              },
            }),
          );
        } else if (parts[1] === "saint") {
          window.dispatchEvent(
            new CustomEvent("purify:annotation", {
              detail: {
                kind: "saint-paragraph",
                saintSlug: parts[2],
                workSlug: parts[3],
                sectionN: Number(parts[4]),
                paragraphIdx: Number(parts[5]),
                data: value,
                source: FROM_SYNC,
              },
            }),
          );
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* swallow */
  }
  return seen;
}

/**
 * Two-way: the sweep (removals, and what the server lacks), the pull, then
 * whatever changed here after the server's copy, key by key.
 */
export async function syncAnnotations() {
  await pushAllLocalAnnotations();
  const server = await pullServerAnnotations();
  if (server.size === 0) return;
  const newer: string[] = [];
  for (const { key, value } of snapshotLocal()) {
    const at = server.get(key);
    if (at && value.at && Date.parse(value.at) > Date.parse(at)) newer.push(key);
  }
  if (newer.length) await pushAnnotationKeys(newer);
}
