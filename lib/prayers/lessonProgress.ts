"use client";

// Which lessons of Learn to pray a reader has read (1.7, the owner's note
// 16: "lessons in order with progress"). Learning, not prayer: the owner's
// rule of 2026-10-16 against counts inside prayers leaves Learn to pray free
// to show which lessons are done, and that is all this keeps: each lesson
// read, and when, on this device. Nothing is synced and nothing is scored.
//
// A lesson is read once its last words have been on the screen for a moment
// (components/prayers/LessonEnd.tsx).
//
//   purify.learning.read    JSON {id, at}[]   the lessons read, oldest first
//
// Every read and write survives blocked storage (a private window) by doing
// nothing, and every write tells the page (purify:learning).

import { useSyncExternalStore } from "react";

export const LESSONS_KEY = "purify.learning.read";
export const LESSONS_EVENT = "purify:learning";

export type LessonRead = { id: string; at: string };

/** The stored list, kept to well-formed entries, one per lesson. */
export function parseLessonsRead(raw: string | null): LessonRead[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: LessonRead[] = [];
    for (const x of parsed) {
      if (!x || typeof x !== "object") continue;
      const { id, at } = x as { id?: unknown; at?: unknown };
      if (typeof id !== "string" || !id || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, at: typeof at === "string" ? at : "" });
    }
    return out;
  } catch {
    return [];
  }
}

export function readLessons(): LessonRead[] {
  if (typeof window === "undefined") return [];
  try {
    return parseLessonsRead(window.localStorage.getItem(LESSONS_KEY));
  } catch {
    return [];
  }
}

/** Keep a lesson as read. Once: a lesson read again keeps the day it was first read. */
export function markLessonRead(id: string, now: Date = new Date()): void {
  if (typeof window === "undefined") return;
  const list = readLessons();
  if (list.some((l) => l.id === id)) return;
  try {
    window.localStorage.setItem(LESSONS_KEY, JSON.stringify([...list, { id, at: now.toISOString() }]));
    window.dispatchEvent(new CustomEvent(LESSONS_EVENT, { detail: { id } }));
  } catch {
    /* blocked storage: the lesson is simply not remembered */
  }
}

/** The first lesson, in order, not read yet; null once every one has been. */
export function nextLessonId(read: ReadonlySet<string>, ids: readonly string[]): string | null {
  return ids.find((id) => !read.has(id)) ?? null;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LESSONS_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(LESSONS_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The ids read, as a stable string snapshot so React re-renders only on a change. */
function snapshot(): string {
  return readLessons()
    .map((l) => l.id)
    .join(" ");
}

/** The lessons read on this device; empty on the server and before mount. */
export function useLessonsRead(): ReadonlySet<string> {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "");
  return new Set(raw ? raw.split(" ") : []);
}
