// A reader's walk through a book, kept on the device.
//
// What is kept: which chapters are finished (and when), which cards were
// opened, the sentence written at the end of each chapter (the reflective
// ledger), and every day there was walking, which is what the streak counts.
// The owner asked for streaks in full (2026-09-28, overriding the
// specification's ban); the count forgives today, the same rule as
// lib/campaigns/streak.ts, so it never reads zero at breakfast.
//
// Pure functions over a plain object (tested directly), and thin storage
// wrappers that write, then announce the change for the hook in
// ./useWalkProgress.ts. Device-local for now: carrying it across devices
// needs a table, which is a migration and the owner's sign-off.

import { computeStreak } from "@/lib/campaigns/streak";
import type { DayKey } from "@/lib/rhythm/dayKey";
import { markKept, strandKey } from "@/lib/rhythm/marks";

export const WALK_EVENT = "purify:walk";

export function walkKey(book: string): string {
  return `purify:walk:${book}`;
}

export type WalkProgress = {
  v: 1;
  /** Chapter number (as a string key) to the time it was finished. */
  done: Record<string, number>;
  /** Card ids opened, first-opened order. */
  opened: string[];
  /** Chapter number to the reader's own sentence. */
  ledger: Record<string, { text: string; at: number }>;
  /** Days with walking, sorted, unique. */
  days: DayKey[];
  /** The chapter last opened, for "continue". */
  last: number | null;
};

export function emptyProgress(): WalkProgress {
  return { v: 1, done: {}, opened: [], ledger: {}, days: [], last: null };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Tolerant: anything malformed reads as a fresh walk rather than throwing. */
export function parseProgress(raw: string | null): WalkProgress {
  if (!raw) return emptyProgress();
  try {
    const p = JSON.parse(raw) as unknown;
    if (!isRecord(p)) return emptyProgress();
    const done: Record<string, number> = {};
    if (isRecord(p.done)) {
      for (const [k, v] of Object.entries(p.done)) if (typeof v === "number" && /^\d+$/.test(k)) done[k] = v;
    }
    const opened = Array.isArray(p.opened) ? p.opened.filter((x): x is string => typeof x === "string") : [];
    const ledger: WalkProgress["ledger"] = {};
    if (isRecord(p.ledger)) {
      for (const [k, v] of Object.entries(p.ledger)) {
        if (isRecord(v) && typeof v.text === "string" && typeof v.at === "number") ledger[k] = { text: v.text, at: v.at };
      }
    }
    const days = Array.isArray(p.days)
      ? [...new Set(p.days.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort()
      : [];
    const last = typeof p.last === "number" ? p.last : null;
    return { v: 1, done, opened: [...new Set(opened)], ledger, days, last };
  } catch {
    return emptyProgress();
  }
}

function withDay(days: DayKey[], day: DayKey): DayKey[] {
  return days.includes(day) ? days : [...days, day].sort();
}

/** Opening a card is walking: it counts the day. */
export function applyOpen(p: WalkProgress, cardId: string, day: DayKey): WalkProgress {
  return {
    ...p,
    opened: p.opened.includes(cardId) ? p.opened : [...p.opened, cardId],
    days: withDay(p.days, day),
  };
}

export function applyVisit(p: WalkProgress, chapter: number): WalkProgress {
  return p.last === chapter ? p : { ...p, last: chapter };
}

/** Finishing a chapter: its sentence is kept and the day counts. */
export function applyComplete(
  p: WalkProgress,
  chapter: number,
  reflection: string,
  day: DayKey,
  now: number,
): WalkProgress {
  const key = String(chapter);
  const text = reflection.trim();
  return {
    ...p,
    done: { ...p.done, [key]: p.done[key] ?? now },
    ledger: text ? { ...p.ledger, [key]: { text, at: now } } : p.ledger,
    days: withDay(p.days, day),
    last: chapter,
  };
}

export function isDone(p: WalkProgress, chapter: number): boolean {
  return String(chapter) in p.done;
}

export function walkStreak(p: WalkProgress, today: DayKey): number {
  return computeStreak(new Set(p.days), today);
}

export function totals(p: WalkProgress): { chapters: number; cards: number; reflections: number } {
  return {
    chapters: Object.keys(p.done).length,
    cards: p.opened.length,
    reflections: Object.values(p.ledger).filter((l) => l.text.length > 0).length,
  };
}

/** Where "continue" goes: the first chapter not yet finished, or null when all are. */
export function nextChapter(p: WalkProgress, count: number): number | null {
  for (let n = 1; n <= count; n++) if (!isDone(p, n)) return n;
  return null;
}

// ── Storage ─────────────────────────────────────────────────────────────

export function readRaw(book: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(walkKey(book));
  } catch {
    return null;
  }
}

export function readProgress(book: string): WalkProgress {
  return parseProgress(readRaw(book));
}

function write(book: string, p: WalkProgress): void {
  try {
    window.localStorage.setItem(walkKey(book), JSON.stringify(p));
  } catch {
    /* storage shut: the walk holds for this page view only */
  }
  try {
    window.dispatchEvent(new CustomEvent(WALK_EVENT));
  } catch {
    /* ignore */
  }
}

export function recordOpen(book: string, cardId: string, day: DayKey): void {
  write(book, applyOpen(readProgress(book), cardId, day));
}

export function recordVisit(book: string, chapter: number): void {
  const p = readProgress(book);
  const next = applyVisit(p, chapter);
  if (next !== p) write(book, next);
}

export function recordComplete(book: string, chapter: number, reflection: string, day: DayKey): void {
  write(book, applyComplete(readProgress(book), chapter, reflection, day, Date.now()));
  // A finished walkthrough chapter is a chapter read: it keeps the day for
  // the streak and the reading strand on Today (lib/rhythm/marks.ts).
  markKept(strandKey("reading"), day);
}
