"use client";

import { useCallback, useSyncExternalStore } from "react";

import { addTombstone, dropTombstone } from "@/lib/sync/tombstones";

/**
 * Per-paragraph annotations on saint writings, stored in localStorage.
 * Mirrors the shape of `lib/bible/annotations.ts:useVerseAnnotation` so the UI
 * patterns transfer one-to-one: highlight toggle, inline note, persistence
 * via a cross-tab CustomEvent, and reads via useSyncExternalStore.
 *
 * Schema:
 *   highlighted?: boolean   (whole-paragraph gold left bar)
 *   note?:        string
 * Key: purify:saint:{saintSlug}:{workSlug}:{sectionN}:{paragraphIdx}
 */

export type ParagraphAnnotation = {
  highlighted?: boolean;
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

export function useParagraphAnnotation(
  saintSlug: string,
  workSlug: string,
  sectionN: number,
  paragraphIdx: number,
) {
  const k = key(saintSlug, workSlug, sectionN, paragraphIdx);
  const data = useSyncExternalStore(
    subscribe,
    () => readSnapshot(k),
    () => EMPTY,
  );

  const persist = useCallback(
    (next: ParagraphAnnotation) => {
      try {
        const isEmpty = !next.highlighted && !next.note;
        // A cleared paragraph leaves a tombstone, so the sync deletes the
        // server's copy instead of pulling it back (lib/sync/tombstones.ts).
        const locator = { saintSlug, workSlug, sectionN, paragraphIdx };
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
              sectionN,
              paragraphIdx,
              data: next,
            },
          }),
        );
      } catch {
        /* storage may be unavailable */
      }
    },
    [k, saintSlug, workSlug, sectionN, paragraphIdx],
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

  return {
    ...data,
    toggleHighlight,
    setNote,
  };
}
