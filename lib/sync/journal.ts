"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { canSync } from "@/lib/entitlements/client";
import {
  cleanRecords,
  isJournalKind,
  mergeRecords,
  readRecords,
  writeRecords,
  type JournalRecord,
} from "@/lib/journal/entries";
import { createClient } from "@/lib/supabase/client";
import { pageAllSettled } from "@/lib/supabase/pageAll";

/**
 * Two-way sync of the journal's own entries (lib/journal/entries.ts) with the
 * public.journal_entries table, which is the owner's SQL
 * (docs/1.7-build/sql/annotation-color-and-journal.sql) and may not exist yet.
 *
 * A probe asks for the table first. Until it answers, entries are kept on the
 * device and nothing else happens: no failed request on every page, no error
 * shown. Once it is there:
 *  - push upserts the entries changed since the last push, by id (the ids are
 *    made on the device, so the same entry is the same row everywhere);
 *  - pull merges by id, the newer `updatedAt` winning, and a removal
 *    (`deletedAt`) travels like any other change;
 *  - an entry removed more than sixty days ago, and pushed since, is let go.
 */

type Row = {
  id: string;
  kind: string;
  body: string;
  prompt: unknown;
  source: unknown;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

const TABLE_KEY = "purify:sync:journalTable";
const PUSHED_KEY = "purify:sync:journalPushedAt";
const REPROBE_MS = 12 * 3_600_000;
const LET_GO_MS = 60 * 86_400_000;
let tableKnown: boolean | null = null;

/** For tests: forget what the probe found. */
export function forgetJournalProbe() {
  tableKnown = null;
}

function remember(ok: boolean) {
  tableKnown = ok;
  try {
    window.localStorage.setItem(TABLE_KEY, JSON.stringify({ ok, at: Date.now() }));
  } catch {
    /* kept for this page only */
  }
}

function isAbsent(error: { code?: string; message?: string }): boolean {
  return error.code === "PGRST205" || error.code === "42P01" || /journal_entries/.test(error.message ?? "");
}

/** True once the server is known to have the journal's table. */
export async function journalTable(supabase: SupabaseClient): Promise<boolean> {
  if (tableKnown !== null) return tableKnown;
  try {
    const saved = JSON.parse(window.localStorage.getItem(TABLE_KEY) ?? "null") as { ok: boolean; at: number } | null;
    if (saved && (saved.ok || Date.now() - saved.at < REPROBE_MS)) {
      tableKnown = saved.ok;
      return saved.ok;
    }
  } catch {
    /* ask */
  }
  try {
    const { error } = await supabase.from("journal_entries").select("id").limit(1);
    if (!error) {
      remember(true);
      return true;
    }
    if (isAbsent(error)) remember(false);
    return false;
  } catch {
    return false;
  }
}

export function toRow(r: JournalRecord, userId: string) {
  return {
    id: r.id,
    user_id: userId,
    kind: r.kind,
    body: r.body,
    prompt: r.prompt ?? null,
    source: r.source ?? null,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
    deleted_at: r.deletedAt ?? null,
  };
}

/** One spelling for a time, whichever way the server wrote it. */
function iso(value: string | null | undefined): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export function fromRow(row: Row): JournalRecord | null {
  if (!row || typeof row.id !== "string" || !isJournalKind(row.kind)) return null;
  const createdAt = iso(row.created_at);
  const updatedAt = iso(row.updated_at);
  if (!createdAt || !updatedAt) return null;
  const record: JournalRecord = {
    id: row.id,
    kind: row.kind,
    body: typeof row.body === "string" ? row.body : "",
    createdAt,
    updatedAt,
  };
  if (row.prompt && typeof row.prompt === "object" && typeof (row.prompt as { text?: unknown }).text === "string") {
    record.prompt = row.prompt as JournalRecord["prompt"];
  }
  if (row.source && typeof row.source === "object" && typeof (row.source as { type?: unknown }).type === "string") {
    record.source = row.source as JournalRecord["source"];
  }
  const deletedAt = iso(row.deleted_at);
  if (deletedAt) record.deletedAt = deletedAt;
  return cleanRecords([record])[0] ?? null;
}

async function session(): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  if (!(await canSync())) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!(await journalTable(supabase))) return null;
  return { supabase, userId: user.id };
}

function pushedAt(): number | null {
  try {
    const v = window.localStorage.getItem(PUSHED_KEY);
    const ms = v ? Date.parse(v) : NaN;
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

/**
 * Push the entries changed here since the last push. The first push of all
 * pulls first: an upsert writes over the row, and a newer copy on the server
 * (an entry removed on the tablet) must reach this device before this
 * device's older copy can reach the server.
 */
export async function pushJournal() {
  try {
    const s = await session();
    if (!s) return;
    let since = pushedAt();
    if (since === null) {
      await pullJournal();
      since = pushedAt();
    }
    const changed = readRecords().filter((r) => since === null || Date.parse(r.updatedAt) > since);
    if (changed.length === 0) return;
    let newest = since ?? 0;
    for (let i = 0; i < changed.length; i += 100) {
      const batch = changed.slice(i, i + 100);
      const { error } = await s.supabase.from("journal_entries").upsert(batch.map((r) => toRow(r, s.userId)), { onConflict: "id" });
      if (error) return;
      for (const r of batch) newest = Math.max(newest, Date.parse(r.updatedAt));
    }
    try {
      window.localStorage.setItem(PUSHED_KEY, new Date(newest).toISOString());
    } catch {
      /* pushed again next time, harmlessly */
    }
  } catch {
    /* swallow */
  }
}

/** Pull every entry and merge it in, the newer copy of each winning. */
export async function pullJournal(now = Date.now()) {
  try {
    const s = await session();
    if (!s) return;
    const { data, error } = await pageAllSettled<Row>((from, to) =>
      s.supabase
        .from("journal_entries")
        .select("id, kind, body, prompt, source, created_at, updated_at, deleted_at")
        .order("updated_at", { ascending: false })
        .order("id")
        .range(from, to) as unknown as PromiseLike<{ data: Row[] | null; error: { message: string } | null }>,
    );
    if (error || !data) return;
    const incoming = data.map(fromRow).filter((r): r is JournalRecord => r !== null);
    const { list, changed } = mergeRecords(readRecords(), incoming);
    const pushed = pushedAt();
    const kept = list.filter(
      (r) => !(r.deletedAt && now - Date.parse(r.deletedAt) > LET_GO_MS && pushed !== null && Date.parse(r.updatedAt) <= pushed),
    );
    if (changed || kept.length !== list.length) writeRecords(kept, true);
  } catch {
    /* swallow */
  }
}

/** Two-way. On sign-in, on each (app) page, and from Sync now. */
export async function syncJournal() {
  await pullJournal();
  await pushJournal();
}
