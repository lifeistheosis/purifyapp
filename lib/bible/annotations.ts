"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_HIGHLIGHT_COLOR } from "./highlightColors";

/**
 * Per-verse annotations stored in localStorage.
 * Schema:
 *   highlighted?:      boolean       (whole-verse text wash)
 *   highlightedWords?: number[]      (sorted word-index list for word-level tints)
 *   color?:            string        (highlight color id; applies to the verse
 *                                     wash AND this verse's word tints. Defaults
 *                                     to yellow when a highlight is created.)
 *   note?:             string
 * Key: purify:bible:{book}:{chapter}:{verse}
 *
 * Reads go through useSyncExternalStore (subscribing to the same-tab
 * `purify:annotation` CustomEvent + cross-tab `storage` event) so there is no
 * hydrate-in-effect setState, and every mounted instance for the same verse
 * stays in sync.
 */

export type VerseAnnotation = {
  highlighted?: boolean;
  highlightedWords?: number[];
  color?: string;
  note?: string;
};

function key(book: string, chapter: number, verse: number) {
  return `purify:bible:${book}:${chapter}:${verse}`;
}

const EMPTY: VerseAnnotation = {};

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
  const k = key(book, chapter, verse);
  const data = useSyncExternalStore(
    subscribe,
    () => readSnapshot(k),
    () => EMPTY,
  );

  const persist = useCallback(
    (next: VerseAnnotation) => {
      try {
        const isEmpty =
          !next.highlighted &&
          !next.note &&
          (!next.highlightedWords || next.highlightedWords.length === 0);
        if (!isEmpty) {
          window.localStorage.setItem(k, JSON.stringify(next));
        } else {
          window.localStorage.removeItem(k);
        }
        // Bust the cache so the next snapshot reflects this write immediately.
        snapCache.delete(k);
        window.dispatchEvent(
          new CustomEvent("purify:annotation", {
            detail: { book, chapter, verse, data: next },
          }),
        );
      } catch {
        /* storage may be unavailable */
      }
    },
    [k, book, chapter, verse],
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
      persist({ ...data, note: trimmed || undefined });
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
