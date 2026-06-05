"use client";

import { useSyncExternalStore } from "react";

/**
 * Reading history, a most-recent-first log of what the reader has opened
 * across the corpus (saint works, saint profiles, topics, councils,
 * heresies). Powers the Reading Hub's "Continue reading" and "Your Next
 * Read" rails.
 *
 * Storage:
 * purify:reading-history = ReadEntry[] // JSON, most recent first
 *
 * Modeled on lib/bookmarks.ts (useSyncExternalStore + a single localStorage
 * array under a purify:* key). Deduped by href, capped at CAP entries.
 */

export type ReadKind = "work" | "saint" | "topic" | "council" | "heresy";

export type ReadEntry = {
 kind: ReadKind;
 /** Canonical route, e.g. "/saints/athanasius-the-great/on-the-incarnation". */
 href: string;
 /** Pre-rendered display label. Set by the caller. */
 label: string;
 /** For works/saints: the saint slug, used by curated-path matching. */
 saintSlug?: string;
 /** Subject topics, used by curated-path matching. */
 topics?: string[];
 /** Date.now() of the visit. */
 at: number;
};

const STORAGE_KEY = "purify:reading-history";
const EVENT = "purify:reading-history";
const CAP = 40;

function writeAll(items: ReadEntry[]) {
 try {
 window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
 window.dispatchEvent(new CustomEvent(EVENT, { detail: { items } }));
 } catch {
 /* storage may be unavailable */
 }
}

function readAll(): ReadEntry[] {
 if (typeof window === "undefined") return [];
 try {
 const raw = window.localStorage.getItem(STORAGE_KEY);
 if (!raw) return [];
 const parsed = JSON.parse(raw);
 return Array.isArray(parsed) ? (parsed as ReadEntry[]) : [];
 } catch {
 return [];
 }
}

/**
 * Record a visit. Moves the entry to the front (dedup by href) and refreshes
 * its timestamp, so revisiting an item bumps it to "most recent". Safe to call
 * on every reader mount.
 */
export function recordRead(entry: Omit<ReadEntry, "at">) {
 if (typeof window === "undefined") return;
 const current = readAll().filter((e) => e.href !== entry.href);
 const next: ReadEntry = { ...entry, at: Date.now() };
 writeAll([next, ...current].slice(0, CAP));
}

// Stable snapshot for useSyncExternalStore: cache the parsed array keyed by the
// raw string so reads return the same reference until the list actually changes.
const EMPTY_LIST: ReadEntry[] = [];
let snapRaw: string | null | undefined;
let snapVal: ReadEntry[] = EMPTY_LIST;

function readSnapshot(): ReadEntry[] {
 if (typeof window === "undefined") return EMPTY_LIST;
 let raw: string | null = null;
 try {
 raw = window.localStorage.getItem(STORAGE_KEY);
 } catch {
 return EMPTY_LIST;
 }
 if (raw === snapRaw) return snapVal;
 snapRaw = raw;
 if (!raw) {
 snapVal = EMPTY_LIST;
 return snapVal;
 }
 try {
 const parsed = JSON.parse(raw);
 snapVal = Array.isArray(parsed) ? (parsed as ReadEntry[]) : EMPTY_LIST;
 } catch {
 snapVal = EMPTY_LIST;
 }
 return snapVal;
}

function subscribe(cb: () => void): () => void {
 if (typeof window === "undefined") return () => {};
 window.addEventListener(EVENT, cb);
 window.addEventListener("storage", cb);
 return () => {
 window.removeEventListener(EVENT, cb);
 window.removeEventListener("storage", cb);
 };
}

/**
 * Live reading history, most recent first. Server snapshot is the empty list
 * so SSR never renders history-dependent UI (callers still gate on a mounted
 * flag where a flash would otherwise show).
 */
export function useReadingHistory(): ReadEntry[] {
 return useSyncExternalStore(subscribe, readSnapshot, () => EMPTY_LIST);
}

/** Imperative read for non-hook callers. */
export function getReadingHistory(): ReadEntry[] {
 return readAll();
}

/** Clear the whole history. */
export function clearReadingHistory() {
 if (typeof window === "undefined") return;
 writeAll([]);
}
