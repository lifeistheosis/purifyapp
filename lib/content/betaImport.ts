// Map an existing beta install's localStorage into migration records.
//
// Beta builds kept user data in `purify:*` / `purify.*` localStorage keys. We
// preserve every one of them (no loss) by importing under a stable id derived
// from the storage key, so a later re-sync upserts rather than duplicates. The
// precise server-side reshaping is refined as each surface is migrated; the
// goal here is to never drop a user's bookmark, note, highlight, or collection
// when they upgrade to the local-first build.

import type { MigratedRecord } from "./migration";
import type { UserRecordKind } from "./schema";

// Storage-key prefix → record kind. Order matters (first match wins).
const PREFIX_KIND: ReadonlyArray<[string, UserRecordKind]> = [
  ["purify:bookmark", "bookmark"],
  ["purify:annotation", "highlight"],
  ["purify:highlight", "highlight"],
  ["purify:note", "note"],
  ["purify:florileg", "florilegium"],
  ["purify:reading-history", "reading_progress"],
  ["purify.reader.", "reading_progress"],
  ["purify:reading", "reading_progress"],
];

/** A minimal localStorage-like surface (so this is testable without a DOM). */
export interface KeyValueSnapshot {
  length: number;
  key(i: number): string | null;
  getItem(k: string): string | null;
}

export function scanBetaData(storage: KeyValueSnapshot): MigratedRecord[] {
  const out: MigratedRecord[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    const match = PREFIX_KIND.find(([p]) => key.startsWith(p));
    if (!match) continue;
    const raw = storage.getItem(key);
    if (raw == null) continue;
    let data: unknown = raw;
    try {
      data = JSON.parse(raw);
    } catch {
      /* keep the raw string — still preserved */
    }
    // Reuse the beta's own updatedAt when the value carries one.
    const updatedAt =
      data && typeof data === "object" && "updatedAt" in data
        ? String((data as { updatedAt: unknown }).updatedAt)
        : undefined;
    out.push({ kind: match[1], id: key, data, updatedAt });
  }
  return out;
}

/** Convenience for the native runtime (guards a missing window). */
export function scanBrowserBetaData(): MigratedRecord[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  return scanBetaData(window.localStorage);
}
