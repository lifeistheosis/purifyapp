"use client";

import { useEffect } from "react";

/**
 * Records the chapter currently being read to localStorage under
 * `purify:bible:last`, so the mobile Bible shell's "Continue reading" card
 * (components/mobile/BibleMobileContinue.tsx) can offer a one-tap resume.
 *
 * This island is the *writer* that the Continue card has always assumed
 * existed: the card reads the key, but nothing ever wrote it, so the card
 * sat permanently in its empty state. Rendered once per chapter page; the
 * effect re-runs whenever the book/chapter changes during client navigation.
 */
export function BibleLastVisitWriter({
  slug,
  bookName,
  chapter,
}: {
  slug: string;
  bookName: string;
  chapter: number;
}) {
  useEffect(() => {
    try {
      localStorage.setItem(
        "purify:bible:last",
        JSON.stringify({ book: slug, bookName, chapter, ts: Date.now() }),
      );
    } catch {
      /* storage may be unavailable (private mode, quota) */
    }
  }, [slug, bookName, chapter]);

  return null;
}
