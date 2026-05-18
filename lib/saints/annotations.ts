"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-paragraph annotations on saint writings, stored in localStorage.
 * Mirrors the shape of `lib/bible/annotations.ts:useVerseAnnotation` so the UI
 * patterns transfer one-to-one: highlight toggle, inline note, persistence
 * via a cross-tab CustomEvent.
 *
 * Schema:
 *   highlighted?: boolean   (whole-paragraph gold left bar)
 *   note?:        string
 * Key: purify:saint:{saintSlug}:{workSlug}:{sectionN}:{paragraphIdx}
 */

export type ParagraphAnnotation = {
  highlighted?: boolean;
  note?: string;
};

function key(
  saintSlug: string,
  workSlug: string,
  sectionN: number,
  paragraphIdx: number,
) {
  return `purify:saint:${saintSlug}:${workSlug}:${sectionN}:${paragraphIdx}`;
}

export function useParagraphAnnotation(
  saintSlug: string,
  workSlug: string,
  sectionN: number,
  paragraphIdx: number,
) {
  const [data, setData] = useState<ParagraphAnnotation>({});

  // Hydrate from localStorage after mount (avoid SSR mismatch).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(
        key(saintSlug, workSlug, sectionN, paragraphIdx),
      );
      if (raw) setData(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [saintSlug, workSlug, sectionN, paragraphIdx]);

  // Listen for cross-tab + same-tab updates dispatched by `persist`.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onAnn(e: Event) {
      const ce = e as CustomEvent<{
        kind: string;
        saintSlug: string;
        workSlug: string;
        sectionN: number;
        paragraphIdx: number;
        data: ParagraphAnnotation;
      }>;
      const d = ce.detail;
      if (
        d?.kind === "saint-paragraph" &&
        d.saintSlug === saintSlug &&
        d.workSlug === workSlug &&
        d.sectionN === sectionN &&
        d.paragraphIdx === paragraphIdx
      ) {
        setData(d.data);
      }
    }
    window.addEventListener("purify:annotation", onAnn as EventListener);
    return () =>
      window.removeEventListener("purify:annotation", onAnn as EventListener);
  }, [saintSlug, workSlug, sectionN, paragraphIdx]);

  const persist = useCallback(
    (next: ParagraphAnnotation) => {
      setData(next);
      try {
        const k = key(saintSlug, workSlug, sectionN, paragraphIdx);
        const isEmpty = !next.highlighted && !next.note;
        if (!isEmpty) {
          window.localStorage.setItem(k, JSON.stringify(next));
        } else {
          window.localStorage.removeItem(k);
        }
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
    [saintSlug, workSlug, sectionN, paragraphIdx],
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
