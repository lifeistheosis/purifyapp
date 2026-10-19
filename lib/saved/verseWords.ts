"use client";

/**
 * The words of a saved verse, for Saved's rows (1.7, the owner's note 21:
 * "verses show their words, not just the reference").
 *
 * The list used to fetch them with a plain fetch('/api/bible/verse') behind a
 * "Show text" toggle. The apps have no server of their own (app/api is not in
 * the static export), so that toggle said "Couldn't load the text" on every
 * phone, and offline everywhere.
 *
 * Now, first: the words kept on the device. A verse keeps its words when it
 * is starred or highlighted (components/bible/VerseRow.tsx, into the store
 * Remember a verse reads, lib/remember/schedule.ts). Then, for a verse saved
 * before that: purifyapp.net through apiFetch, which the apps can reach, one
 * request per chapter however many of its verses are on the list, and the
 * words are kept so the next look needs no network. Offline with nothing
 * kept, the row says "Open to read" and opens the verse.
 */

import { useEffect, useSyncExternalStore } from "react";

import { apiFetch } from "@/lib/api/client";
import { keepTexts, keptTexts, verseKey } from "@/lib/remember/schedule";

export type WordsState = { text: string | null; status: "kept" | "loading" | "missing" };

const MISSING: WordsState = { text: null, status: "missing" };
const LOADING: WordsState = { text: null, status: "loading" };

/** Fetched or failed this session, by verse key. */
const fetched = new Map<string, string | null>();
const asking = new Set<string>();
const listeners = new Set<() => void>();
const states = new Map<string, WordsState>();

let keptRaw: Readonly<Record<string, string>> | null = null;
function kept(): Readonly<Record<string, string>> {
  if (!keptRaw) {
    try {
      keptRaw = keptTexts();
    } catch {
      keptRaw = {};
    }
  }
  return keptRaw;
}

function notify() {
  states.clear();
  listeners.forEach((l) => l());
}

function stateOf(key: string): WordsState {
  const cached = states.get(key);
  if (cached) return cached;
  const text = kept()[key] ?? fetched.get(key) ?? null;
  const next: WordsState = text ? { text, status: "kept" } : asking.has(key) ? LOADING : fetched.has(key) ? MISSING : LOADING;
  states.set(key, next);
  return next;
}

// ── One request per chapter ──────────────────────────────────────────────

const queue = new Map<string, { book: string; chapter: number; verses: Set<number> }>();
let flushTimer: number | undefined;

function want(book: string, chapter: number, verse: number) {
  const key = verseKey(book, chapter, verse);
  if (kept()[key] || fetched.has(key) || asking.has(key)) return;
  asking.add(key);
  const ck = `${book}/${chapter}`;
  const entry = queue.get(ck) ?? { book, chapter, verses: new Set<number>() };
  entry.verses.add(verse);
  queue.set(ck, entry);
  window.clearTimeout(flushTimer);
  // Rows that come into view together are asked for together.
  flushTimer = window.setTimeout(flush, 60);
}

function flush() {
  const jobs = [...queue.values()];
  queue.clear();
  for (const job of jobs) void fetchChapter(job.book, job.chapter, [...job.verses]);
}

async function fetchChapter(book: string, chapter: number, verses: number[]) {
  const sorted = [...verses].sort((a, b) => a - b);
  // The route serves at most 201 verses a request (Psalm 118 has 176).
  const spans: [number, number][] = [];
  for (const v of sorted) {
    const last = spans[spans.length - 1];
    if (last && v - last[0] <= 200) last[1] = v;
    else spans.push([v, v]);
  }
  const found: [string, string][] = [];
  for (const [from, to] of spans) {
    try {
      const res = await apiFetch(`/api/bible/verse?book=${encodeURIComponent(book)}&chapter=${chapter}&from=${from}&to=${to}`);
      if (!res.ok) continue;
      const data = (await res.json()) as { verses?: { n: number; text: string }[] };
      for (const v of data.verses ?? []) {
        if (!verses.includes(v.n) || !v.text) continue;
        found.push([verseKey(book, chapter, v.n), v.text.trim()]);
      }
    } catch {
      /* offline: "Open to read" */
    }
  }
  for (const v of verses) {
    const key = verseKey(book, chapter, v);
    asking.delete(key);
    fetched.set(key, found.find(([k]) => k === key)?.[1] ?? null);
  }
  if (found.length) {
    try {
      keepTexts(found);
    } catch {
      /* kept for this session only */
    }
    keptRaw = null;
  }
  notify();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * A verse's words. `visible` asks for them: a row asks once it is near the
 * screen, so a long list fetches only what is read.
 */
export function useVerseWords(book: string, chapter: number, verse: number, visible: boolean): WordsState {
  const key = verseKey(book, chapter, verse);
  const state = useSyncExternalStore(subscribe, () => stateOf(key), () => LOADING);
  useEffect(() => {
    if (visible && state.status === "loading" && !asking.has(key) && !fetched.has(key)) {
      want(book, chapter, verse);
    }
  }, [visible, state.status, key, book, chapter, verse]);
  return state;
}

/** The words kept for a verse, now, without asking the network. */
export function keptWordsOf(book: string, chapter: number, verse: number): string | null {
  const key = verseKey(book, chapter, verse);
  return kept()[key] ?? fetched.get(key) ?? null;
}

/** Forget the cached read of the kept words (a verse was kept elsewhere). */
export function refreshKeptWords() {
  keptRaw = null;
  notify();
}
