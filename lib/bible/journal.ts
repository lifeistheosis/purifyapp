"use client";

import { useSyncExternalStore } from "react";

/**
 * The journal (2026-09-30, a Purify Plus tool): every note a reader has
 * written in the Scriptures, newest first, gathered from the same per-verse
 * annotations the reader writes into (lib/bible/annotations.ts). Nothing new
 * is stored; the journal is a way of reading what is already there.
 *
 * A note carries `noteAt` from the day this change shipped. Older notes have
 * no date and sort after the dated ones, in canonical order.
 */

export type JournalEntry = {
  book: string;
  chapter: number;
  verse: number;
  note: string;
  /** ISO time it was last written, when known. */
  at: string | null;
};

const PREFIX = "purify:bible:";

/** Newest first; undated notes last, in the order they were found. */
export function sortJournal(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => {
    if (a.at && b.at) return b.at.localeCompare(a.at);
    if (a.at) return -1;
    if (b.at) return 1;
    return 0;
  });
}

/** Parse one localStorage entry into a journal entry, or null. */
export function entryFrom(key: string, raw: string | null): JournalEntry | null {
  if (!key.startsWith(PREFIX) || !raw) return null;
  const [, , book, chapter, verse] = key.split(":");
  if (!book || !chapter || !verse) return null;
  try {
    const value = JSON.parse(raw) as { note?: unknown; noteAt?: unknown };
    if (typeof value.note !== "string" || !value.note.trim()) return null;
    return {
      book,
      chapter: Number(chapter),
      verse: Number(verse),
      note: value.note,
      at: typeof value.noteAt === "string" ? value.noteAt : null,
    };
  } catch {
    return null;
  }
}

/**
 * Notes written on this day of the month in an earlier month, at least four
 * weeks ago: "from this day". The journal's small act of remembering.
 */
export function fromThisDay(entries: JournalEntry[], now: Date): JournalEntry[] {
  const day = now.getDate();
  const cutoff = now.getTime() - 28 * 86_400_000;
  return entries.filter((e) => {
    if (!e.at) return false;
    const at = new Date(e.at);
    return at.getDate() === day && at.getTime() <= cutoff;
  });
}

/** Group by the month a note was written in; undated notes in their own group. */
export function byMonth(entries: JournalEntry[]): { key: string; entries: JournalEntry[] }[] {
  const groups = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const key = e.at ? e.at.slice(0, 7) : "undated";
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()].map(([key, list]) => ({ key, entries: list }));
}

// ── The live list ────────────────────────────────────────────────────────

let cache: { sig: string; list: JournalEntry[] } | null = null;
const EMPTY: JournalEntry[] = [];

function snapshot(): JournalEntry[] {
  if (typeof window === "undefined") return EMPTY;
  const found: JournalEntry[] = [];
  const sig: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const raw = window.localStorage.getItem(key);
      const entry = entryFrom(key, raw);
      if (!entry) continue;
      found.push(entry);
      sig.push(`${key}=${raw}`);
    }
  } catch {
    return EMPTY;
  }
  const signature = sig.sort().join("|");
  if (!cache || cache.sig !== signature) cache = { sig: signature, list: sortJournal(found) };
  return cache.list;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("purify:annotation", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("purify:annotation", cb);
    window.removeEventListener("storage", cb);
  };
}

/** Every note, newest first. Empty on the server and on first paint. */
export function useJournal(): JournalEntry[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
