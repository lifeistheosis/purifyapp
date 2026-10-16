"use client";

import { useSyncExternalStore } from "react";

/**
 * The journal's own entries (1.7, the owner's note 23: "the journal feels
 * thin and not made for phones").
 *
 * Until 1.7 the journal was only the notes a reader wrote on verses
 * (lib/bible/journal.ts). Those stay where they are, on their verses; this is
 * what a reader writes in the journal itself: a reflection, a prayer, or an
 * answer to a reading plan's question, each with what it was written about
 * (a verse, a chapter, a plan's day) and, for an answer, the question.
 *
 * On the device, in one localStorage entry, the lib/plans/progress.ts way:
 *   purify:journal       = JournalRecord[]
 *   purify:journal.draft = what the composer holds while it is closed
 * A removed entry keeps its place with `deletedAt` set, which is how the
 * removal reaches the server (lib/sync/journal.ts) and how Undo restores it.
 * Signed in, with the owner's table in place, entries sync; until then they
 * are kept here.
 */

export type JournalKind = "reflection" | "prayer" | "question";
export const JOURNAL_KINDS: readonly JournalKind[] = ["reflection", "prayer", "question"];

export type JournalSource =
  | { type: "verse"; book: string; chapter: number; verse: number; label: string }
  | { type: "chapter"; book: string; chapter: number; label: string }
  | { type: "plan-day"; planId: string; day: number; label: string };

export type JournalPrompt = {
  /** The plan question's key in the guide (lib/plans/guide.ts), when it is one. */
  key?: string;
  /** The question as the reader saw it. */
  text: string;
};

export type JournalRecord = {
  id: string;
  kind: JournalKind;
  body: string;
  prompt?: JournalPrompt;
  source?: JournalSource;
  createdAt: string;
  updatedAt: string;
  /** Removed (ISO). Kept so the removal syncs and Undo can bring it back. */
  deletedAt?: string;
};

export type JournalDraft = {
  kind: JournalKind;
  body: string;
  prompt?: JournalPrompt;
  source?: JournalSource;
  /** The record being edited, or the verse note (`note:<book>:<ch>:<v>`). */
  editing?: string;
};

export const JOURNAL_KEY = "purify:journal";
const DRAFT_KEY = "purify:journal.draft";
export const JOURNAL_EVENT = "purify:journal";
/** The longest entry, the same as the server's check. */
export const MAX_BODY = 20_000;

export function isJournalKind(v: unknown): v is JournalKind {
  return v === "reflection" || v === "prayer" || v === "question";
}

/** Keep only well-formed records. */
export function cleanRecords(value: unknown): JournalRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (r): r is JournalRecord =>
      !!r &&
      typeof r === "object" &&
      typeof (r as JournalRecord).id === "string" &&
      isJournalKind((r as JournalRecord).kind) &&
      typeof (r as JournalRecord).body === "string" &&
      typeof (r as JournalRecord).createdAt === "string" &&
      typeof (r as JournalRecord).updatedAt === "string",
  );
}

export function readRecords(): JournalRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(JOURNAL_KEY);
    return raw ? cleanRecords(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

/**
 * Write the whole list. `fromSync` marks the sync's own write, so SyncBridge
 * does not push it straight back.
 */
export function writeRecords(list: JournalRecord[], fromSync = false): void {
  try {
    window.localStorage.setItem(JOURNAL_KEY, JSON.stringify(list));
    cache = null;
    window.dispatchEvent(new CustomEvent(JOURNAL_EVENT, { detail: fromSync ? { source: "sync" } : {} }));
  } catch {
    /* storage shut: the entry is not kept, and the composer keeps its draft */
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // A v4-shaped id, for the server's uuid column, where randomUUID is missing.
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex(3)}-${hex(12)}`;
}

export function addRecord(
  input: { kind: JournalKind; body: string; prompt?: JournalPrompt; source?: JournalSource },
  now: Date = new Date(),
): JournalRecord {
  const at = now.toISOString();
  const record: JournalRecord = {
    id: newId(),
    kind: input.kind,
    body: input.body.slice(0, MAX_BODY),
    ...(input.prompt ? { prompt: input.prompt } : {}),
    ...(input.source ? { source: input.source } : {}),
    createdAt: at,
    updatedAt: at,
  };
  writeRecords([record, ...readRecords()]);
  return record;
}

export function updateRecord(
  id: string,
  patch: Partial<Pick<JournalRecord, "kind" | "body" | "prompt" | "source">>,
  now: Date = new Date(),
): void {
  const list = readRecords();
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return;
  const next = { ...list[i], ...patch, updatedAt: now.toISOString() };
  next.body = next.body.slice(0, MAX_BODY);
  list[i] = next;
  writeRecords(list);
}

/** Take an entry away. It stays in the list, marked, until the sync is done with it. */
export function removeRecord(id: string, now: Date = new Date()): JournalRecord | null {
  const list = readRecords();
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return null;
  const at = now.toISOString();
  list[i] = { ...list[i], deletedAt: at, updatedAt: at };
  writeRecords(list);
  return list[i];
}

/** Undo a removal. */
export function restoreRecord(id: string, now: Date = new Date()): void {
  const list = readRecords();
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return;
  const { deletedAt: _gone, ...rest } = list[i];
  void _gone;
  list[i] = { ...rest, updatedAt: now.toISOString() };
  writeRecords(list);
}

/**
 * Merge records from elsewhere (the server) by id: the newer `updatedAt`
 * wins, a removal travels like any change. Returns the merged list and
 * whether anything here changed.
 */
export function mergeRecords(local: JournalRecord[], incoming: JournalRecord[]): { list: JournalRecord[]; changed: boolean } {
  const byId = new Map(local.map((r) => [r.id, r]));
  let changed = false;
  for (const r of incoming) {
    const mine = byId.get(r.id);
    if (!mine || Date.parse(r.updatedAt) > Date.parse(mine.updatedAt)) {
      byId.set(r.id, r);
      changed = true;
    }
  }
  const list = [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { list, changed };
}

// ── The draft ────────────────────────────────────────────────────────────

export function readDraft(): JournalDraft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    const d = raw ? (JSON.parse(raw) as JournalDraft) : null;
    return d && isJournalKind(d.kind) && typeof d.body === "string" ? d : null;
  } catch {
    return null;
  }
}

export function writeDraft(draft: JournalDraft): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* the draft lives as long as the composer then */
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing kept */
  }
}

// ── Plan questions put aside ─────────────────────────────────────────────

const DISMISSED_KEY = "purify:journal.dismissed";

/** The plan days whose questions the reader put aside ("Not now"), as `plan:day`. */
export function readDismissed(): string[] {
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function dismissPlanDay(planId: string, day: number): void {
  const key = `${planId}:${day}`;
  const list = readDismissed();
  if (list.includes(key)) return;
  try {
    // The last fifty are plenty: only the latest finished day is ever asked.
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...list, key].slice(-50)));
    cache = null;
    window.dispatchEvent(new CustomEvent(JOURNAL_EVENT, { detail: { source: "sync" } }));
  } catch {
    /* asked again next time */
  }
}

// ── The live list ────────────────────────────────────────────────────────

let cache: { raw: string | null; dismissed: string | null; list: JournalRecord[]; gone: string[] } | null = null;
const EMPTY: JournalRecord[] = [];
const NONE: string[] = [];

function snapshot(): { list: JournalRecord[]; gone: string[] } {
  let raw: string | null = null;
  let dismissed: string | null = null;
  try {
    raw = window.localStorage.getItem(JOURNAL_KEY);
    dismissed = window.localStorage.getItem(DISMISSED_KEY);
  } catch {
    return { list: EMPTY, gone: NONE };
  }
  if (!cache || cache.raw !== raw || cache.dismissed !== dismissed) {
    cache = { raw, dismissed, list: readRecords(), gone: readDismissed() };
  }
  return cache;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(JOURNAL_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(JOURNAL_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Every record, removed ones included (the feed leaves them out). */
export function useJournalRecords(): JournalRecord[] {
  return useSyncExternalStore(subscribe, () => snapshot().list, () => EMPTY);
}

/** The plan days put aside. */
export function useDismissedPlanDays(): string[] {
  return useSyncExternalStore(subscribe, () => snapshot().gone, () => NONE);
}
