"use client";

import { useCallback, useSyncExternalStore } from "react";

import { lastHighlightColor } from "@/lib/bible/highlightColors";
import { addTombstone, dropTombstone } from "@/lib/sync/tombstones";

import { fromBeforeSplit, seeSplit, sharedBefore } from "./sharedSections";

/**
 * Per-paragraph annotations on saint writings, stored in localStorage.
 * Mirrors the shape of `lib/bible/annotations.ts:useVerseAnnotation` so the UI
 * patterns transfer one-to-one: highlight toggle, inline note, persistence
 * via a cross-tab CustomEvent, and reads via useSyncExternalStore.
 *
 * Schema:
 *   highlighted?: boolean   (a wash behind the paragraph's words)
 *   color?:       string    (1.7.1: the highlight's colour, the Bible's
 *                            palette, lib/bible/highlightPalette.ts. A
 *                            paragraph highlighted before has none and wears
 *                            the first colour. The sync carries it as it
 *                            carries a verse's.)
 *   note?:        string
 * Key: purify:saint:{saintSlug}:{workSlug}:{sectionN}:{paragraphIdx}
 */

export type ParagraphAnnotation = {
  highlighted?: boolean;
  color?: string;
  note?: string;
  /** When it last changed here (ISO, 1.7): the sync keeps the newer copy. */
  at?: string;
};

function key(
  saintSlug: string,
  workSlug: string,
  sectionN: number,
  paragraphIdx: number,
) {
  return `purify:saint:${saintSlug}:${workSlug}:${sectionN}:${paragraphIdx}`;
}

const EMPTY: ParagraphAnnotation = {};

/**
 * Where a paragraph's mark is read from: its own key, or, on a section that
 * shared its number with the one before it until 1.9 (./sharedSections.ts),
 * the key of a mark made before the halves were apart, while that mark is
 * there and none of the paragraph's own is (`shared`). Asked at each read and
 * each write, so it follows the mark: changed here, the change is this half's
 * own (ownPlace); taken off here, it is taken off both, as it always was.
 */
function placeOf(saintSlug: string, workSlug: string, sectionN: number, paragraphIdx: number): { k: string; sectionN: number; shared: boolean } {
  const own = key(saintSlug, workSlug, sectionN, paragraphIdx);
  const mine = { k: own, sectionN, shared: false };
  if (typeof window === "undefined") return mine;
  seeSplit(saintSlug, workSlug);
  const before = sharedBefore(saintSlug, workSlug, sectionN);
  if (before === undefined) return mine;
  try {
    if (window.localStorage.getItem(own) !== null) return mine;
    const old = key(saintSlug, workSlug, before, paragraphIdx);
    const raw = window.localStorage.getItem(old);
    if (raw !== null && fromBeforeSplit((JSON.parse(raw) as ParagraphAnnotation).at)) return { k: old, sectionN: before, shared: true };
  } catch {
    /* storage may be unavailable, or the mark unreadable: the paragraph's own */
  }
  return mine;
}

/** Where a write lands: a change to a mark shared from before is this half's own copy; taking it off takes it off both. */
function writePlace(saintSlug: string, workSlug: string, sectionN: number, paragraphIdx: number, empty: boolean): { k: string; sectionN: number } {
  const shown = placeOf(saintSlug, workSlug, sectionN, paragraphIdx);
  if (shown.shared && !empty) return { k: key(saintSlug, workSlug, sectionN, paragraphIdx), sectionN };
  return shown;
}

// Stable-snapshot cache (see lib/bible/annotations.ts for the rationale).
const snapCache = new Map<
  string,
  { raw: string | null; val: ParagraphAnnotation }
>();

function readSnapshot(k: string): ParagraphAnnotation {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(k);
  } catch {
    return EMPTY;
  }
  const cached = snapCache.get(k);
  if (cached && cached.raw === raw) return cached.val;
  let val: ParagraphAnnotation = EMPTY;
  if (raw) {
    try {
      val = JSON.parse(raw) as ParagraphAnnotation;
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

/** What is on a paragraph now, read outside a component (Saved, 1.8). */
export function readParagraphAnnotation(
  saintSlug: string,
  workSlug: string,
  sectionN: number,
  paragraphIdx: number,
): ParagraphAnnotation {
  return readSnapshot(placeOf(saintSlug, workSlug, sectionN, paragraphIdx).k);
}

/**
 * Write what is on a paragraph, outside a component: Saved's swipe and its
 * Undo (1.8), which list the paragraphs a reader highlighted. The hook's
 * rules: empty removes it and leaves a tombstone, so the sync deletes the
 * server's copy instead of pulling it back; anything else drops one. Dated
 * now, unless `at` is given to put back an earlier value exactly.
 */
export function writeParagraphAnnotation(
  saintSlug: string,
  workSlug: string,
  sectionN: number,
  paragraphIdx: number,
  next: ParagraphAnnotation,
): void {
  const empty = !next.highlighted && !next.note;
  const { k, sectionN: n } = writePlace(saintSlug, workSlug, sectionN, paragraphIdx, empty);
  const locator = { saintSlug, workSlug, sectionN: n, paragraphIdx };
  try {
    const value: ParagraphAnnotation = empty ? {} : { ...next, at: next.at ?? new Date().toISOString() };
    if (!empty) {
      window.localStorage.setItem(k, JSON.stringify(value));
      dropTombstone("annotations", "saint-paragraph", locator);
    } else {
      const had = window.localStorage.getItem(k) !== null;
      window.localStorage.removeItem(k);
      if (had) addTombstone("annotations", "saint-paragraph", locator);
    }
    snapCache.delete(k);
    window.dispatchEvent(
      new CustomEvent("purify:annotation", {
        detail: { kind: "saint-paragraph", saintSlug, workSlug, sectionN: n, paragraphIdx, data: value },
      }),
    );
  } catch {
    /* storage may be unavailable */
  }
}

export function useParagraphAnnotation(
  saintSlug: string,
  workSlug: string,
  sectionN: number,
  paragraphIdx: number,
) {
  const data = useSyncExternalStore(
    subscribe,
    () => readSnapshot(placeOf(saintSlug, workSlug, sectionN, paragraphIdx).k),
    () => EMPTY,
  );

  const persist = useCallback(
    (next: ParagraphAnnotation) => {
      try {
        const isEmpty = !next.highlighted && !next.note;
        const { k, sectionN: n } = writePlace(saintSlug, workSlug, sectionN, paragraphIdx, isEmpty);
        // A cleared paragraph leaves a tombstone, so the sync deletes the
        // server's copy instead of pulling it back (lib/sync/tombstones.ts).
        const locator = { saintSlug, workSlug, sectionN: n, paragraphIdx };
        if (!isEmpty) {
          window.localStorage.setItem(k, JSON.stringify({ ...next, at: new Date().toISOString() }));
          dropTombstone("annotations", "saint-paragraph", locator);
        } else {
          const had = window.localStorage.getItem(k) !== null;
          window.localStorage.removeItem(k);
          if (had) addTombstone("annotations", "saint-paragraph", locator);
        }
        snapCache.delete(k);
        window.dispatchEvent(
          new CustomEvent("purify:annotation", {
            detail: {
              kind: "saint-paragraph",
              saintSlug,
              workSlug,
              sectionN: n,
              paragraphIdx,
              data: next,
            },
          }),
        );
      } catch {
        /* storage may be unavailable */
      }
    },
    [saintSlug, workSlug, sectionN, paragraphIdx],
  );

  const toggleHighlight = useCallback(
    (color?: string) => {
      const turningOn = !data.highlighted;
      persist({
        ...data,
        highlighted: turningOn,
        color: turningOn ? (color ?? data.color ?? lastHighlightColor()) : undefined,
      });
    },
    [data, persist],
  );

  // Highlight in this colour, or recolour a highlighted paragraph (1.7.1).
  const setHighlight = useCallback(
    (color: string) => {
      persist({ ...data, highlighted: true, color });
    },
    [data, persist],
  );

  // Take the highlight off; a note on the paragraph stays.
  const clearHighlight = useCallback(() => {
    persist({ ...data, highlighted: undefined, color: undefined });
  }, [data, persist]);

  const setNote = useCallback(
    (note: string) => {
      const trimmed = note.trim();
      persist({ ...data, note: trimmed || undefined });
    },
    [data, persist],
  );

  return {
    ...data,
    toggleHighlight,
    setHighlight,
    clearHighlight,
    setNote,
  };
}
