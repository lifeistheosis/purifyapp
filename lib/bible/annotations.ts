"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-verse annotations stored in localStorage.
 * Schema:
 *   highlighted?:      boolean       (whole-verse left bar)
 *   highlightedWords?: number[]      (sorted word-index list for word-level tints)
 *   note?:             string
 * Key: purify:bible:{book}:{chapter}:{verse}
 */

export type VerseAnnotation = {
  highlighted?: boolean;
  highlightedWords?: number[];
  note?: string;
};

function key(book: string, chapter: number, verse: number) {
  return `purify:bible:${book}:${chapter}:${verse}`;
}

export function useVerseAnnotation(
  book: string,
  chapter: number,
  verse: number,
) {
  const [data, setData] = useState<VerseAnnotation>({});

  // Hydrate from localStorage after mount (avoid SSR mismatch).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(key(book, chapter, verse));
      if (raw) setData(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [book, chapter, verse]);

  const persist = useCallback(
    (next: VerseAnnotation) => {
      setData(next);
      try {
        const isEmpty =
          !next.highlighted &&
          !next.note &&
          (!next.highlightedWords || next.highlightedWords.length === 0);
        if (!isEmpty) {
          window.localStorage.setItem(
            key(book, chapter, verse),
            JSON.stringify(next),
          );
        } else {
          window.localStorage.removeItem(key(book, chapter, verse));
        }
        window.dispatchEvent(
          new CustomEvent("purify:annotation", {
            detail: { book, chapter, verse, data: next },
          }),
        );
      } catch {
        /* storage may be unavailable */
      }
    },
    [book, chapter, verse],
  );

  const toggleHighlight = useCallback(() => {
    persist({ ...data, highlighted: !data.highlighted });
  }, [data, persist]);

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
    setNote,
    toggleWordRange,
    clearWords,
  };
}
