"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_HIGHLIGHT_COLOR } from "./highlightColors";
import { addTombstone, dropTombstone } from "@/lib/sync/tombstones";

/**
 * Per-verse annotations stored in localStorage.
 * Schema:
 *   highlighted?:      boolean       (whole-verse text wash)
 *   highlightedWords?: number[]      (sorted word-index list for word-level tints)
 *   color?:            string        (highlight color id; applies to the verse
 *                                     wash AND this verse's word tints. Defaults
 *                                     to yellow when a highlight is created.)
 *   note?:             string
 *   noteAt?:           string        (ISO time the note was last written, for
 *                                     the journal, lib/bible/journal.ts)
 *   at?:               string        (ISO time of the last change of any kind,
 *                                     1.7: the sync keeps the newer of this and
 *                                     the server's copy)
 *   hlAt?:             string        (ISO time the verse was first highlighted,
 *                                     1.7: Saved lists a highlight by it, so a
 *                                     note edited later does not move it)
 * Key: purify:bible:{book}:{chapter}:{verse}
 *
 * Reads go through useSyncExternalStore (subscribing to the same-tab
 * `purify:annotation` CustomEvent + cross-tab `storage` event) so there is no
 * hydrate-in-effect setState, and every mounted instance for the same verse
 * stays in sync.
 *
 * Writes go through one function, writeVerseAnnotation, for the hook and for
 * the screens that change a verse from elsewhere (Saved's swipe, the journal's
 * composer). A verse left with nothing on it is removed and a tombstone is
 * left for the sync (lib/sync/tombstones.ts), so the server's copy is deleted
 * rather than pulled back.
 */

export type VerseAnnotation = {
  highlighted?: boolean;
  highlightedWords?: number[];
  color?: string;
  note?: string;
  /** When the note was last written (ISO). Kept only while there is a note. */
  noteAt?: string;
  /** When anything on the verse last changed here (ISO). */
  at?: string;
  /** When the verse was highlighted (ISO); kept while it stays highlighted. */
  hlAt?: string;
};

export function verseAnnotationKey(book: string, chapter: number, verse: number) {
  return `purify:bible:${book}:${chapter}:${verse}`;
}

const EMPTY: VerseAnnotation = {};

/** Nothing worth keeping: no highlight, no highlighted word, no note. */
export function isEmptyAnnotation(v: VerseAnnotation): boolean {
  return !v.highlighted && !v.note && (!v.highlightedWords || v.highlightedWords.length === 0);
}

const marked = (v: VerseAnnotation) => !!v.highlighted || (v.highlightedWords?.length ?? 0) > 0;

// useSyncExternalStore requires getSnapshot to return a stable reference while
// the underlying value is unchanged; cache the parsed object keyed by the raw
// string so repeated reads don't allocate (which would loop the store).
const snapCache = new Map<string, { raw: string | null; val: VerseAnnotation }>();

function readSnapshot(k: string): VerseAnnotation {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(k);
  } catch {
    return EMPTY;
  }
  const cached = snapCache.get(k);
  if (cached && cached.raw === raw) return cached.val;
  let val: VerseAnnotation = EMPTY;
  if (raw) {
    try {
      val = JSON.parse(raw) as VerseAnnotation;
    } catch {
      val = EMPTY;
    }
  }
  snapCache.set(k, { raw, val });
  return val;
}

/** What is on a verse now, for code outside a component. */
export function readVerseAnnotation(book: string, chapter: number, verse: number): VerseAnnotation {
  return readSnapshot(verseAnnotationKey(book, chapter, verse));
}

/**
 * Write what is on a verse, dated now. Empty removes it and leaves a
 * tombstone for the sync; anything else drops one, since the verse is marked
 * again. `at` may be given to put back an earlier value exactly (Undo).
 */
export function writeVerseAnnotation(book: string, chapter: number, verse: number, next: VerseAnnotation): void {
  const k = verseAnnotationKey(book, chapter, verse);
  const locator = { book, chapter, verse };
  try {
    const empty = isEmptyAnnotation(next);
    const now = new Date().toISOString();
    const before = readSnapshot(k);
    // The day it was highlighted: kept while it stays highlighted, new when
    // it is highlighted again, gone when it is not.
    const hlAt = marked(next) ? (next.hlAt ?? (marked(before) ? before.hlAt : undefined) ?? (marked(before) ? undefined : now)) : undefined;
    const value: VerseAnnotation = empty ? {} : { ...next, at: next.at ?? now, hlAt };
    if (!empty) {
      window.localStorage.setItem(k, JSON.stringify(value));
      dropTombstone("annotations", "bible-verse", locator);
    } else {
      const had = window.localStorage.getItem(k) !== null;
      window.localStorage.removeItem(k);
      if (had) addTombstone("annotations", "bible-verse", locator);
    }
    // Bust the cache so the next snapshot reflects this write immediately.
    snapCache.delete(k);
    window.dispatchEvent(
      new CustomEvent("purify:annotation", {
        detail: { book, chapter, verse, data: value },
      }),
    );
  } catch {
    /* storage may be unavailable */
  }
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("purify:annotation", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("purify:annotation", cb);
    window.removeEventListener("storage", cb);
  };
}

export function useVerseAnnotation(
  book: string,
  chapter: number,
  verse: number,
) {
  const k = verseAnnotationKey(book, chapter, verse);
  const data = useSyncExternalStore(
    subscribe,
    () => readSnapshot(k),
    () => EMPTY,
  );

  const persist = useCallback(
    (next: VerseAnnotation) => {
      // A fresh date for every change made here, not the one it came with.
      writeVerseAnnotation(book, chapter, verse, { ...next, at: undefined });
    },
    [book, chapter, verse],
  );

  const toggleHighlight = useCallback(
    (color?: string) => {
      const turningOn = !data.highlighted;
      persist({
        ...data,
        highlighted: turningOn,
        color: turningOn
          ? (color ?? data.color ?? DEFAULT_HIGHLIGHT_COLOR)
          : data.color,
      });
    },
    [data, persist],
  );

  // Turn the whole-verse highlight on with an explicit color (used by the
  // color picker when nothing is highlighted yet).
  const setHighlight = useCallback(
    (color: string) => {
      persist({ ...data, highlighted: true, color });
    },
    [data, persist],
  );

  // Recolor the existing annotation (bar + this verse's word tints) without
  // toggling anything on/off. A color with no highlight/words/note is dropped
  // by persist()'s empty check, so this is a no-op on an unmarked verse.
  const setColor = useCallback(
    (color: string) => {
      persist({ ...data, color });
    },
    [data, persist],
  );

  const setNote = useCallback(
    (note: string) => {
      const trimmed = note.trim();
      // Dated when the words change, so the journal can say when a reader
      // wrote it; saving the same words again keeps the first date.
      const noteAt = !trimmed ? undefined : trimmed === data.note ? data.noteAt : new Date().toISOString();
      persist({ ...data, note: trimmed || undefined, noteAt });
    },
    [data, persist],
  );

  /**
   * Toggle a contiguous range of word indices.
   * If every word in the range is already highlighted, the range is REMOVED.
   * Otherwise, every word in the range is ADDED.
   * This gives a single intuitive gesture for both add and remove.
   */
  const toggleWordRange = useCallback(
    (from: number, to: number) => {
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      const set = new Set(data.highlightedWords ?? []);
      const range: number[] = [];
      for (let i = lo; i <= hi; i++) range.push(i);
      const allHighlighted = range.every((i) => set.has(i));
      if (allHighlighted) {
        range.forEach((i) => set.delete(i));
      } else {
        range.forEach((i) => set.add(i));
      }
      const arr = Array.from(set).sort((a, b) => a - b);
      persist({
        ...data,
        highlightedWords: arr.length > 0 ? arr : undefined,
        // First word highlight on an uncolored verse adopts the default color.
        color:
          arr.length > 0 ? (data.color ?? DEFAULT_HIGHLIGHT_COLOR) : data.color,
      });
    },
    [data, persist],
  );

  const clearWords = useCallback(() => {
    persist({ ...data, highlightedWords: undefined });
  }, [data, persist]);

  return {
    ...data,
    toggleHighlight,
    setHighlight,
    setColor,
    setNote,
    toggleWordRange,
    clearWords,
  };
}
