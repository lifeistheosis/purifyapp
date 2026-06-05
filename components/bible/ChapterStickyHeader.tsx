"use client";

import { useEffect, useState } from "react";

/**
 * Mobile-first sticky chapter context. Hidden until the user scrolls past
 * the chapter title; then a thin bar fixes below the 72px navbar showing
 * "<Book> <chapter> · v <current>". The verse number updates via an
 * IntersectionObserver pointed at every `<div id="v{n}">` rendered by
 * VerseRow.
 *
 * Replaces the previous mobile context strip inside ReadingProgressBar so
 * the chrome reads as one tighter element instead of two stacked bars.
 */
export function ChapterStickyHeader({
  bookName,
  chapter,
  totalVerses,
}: {
  bookName: string;
  chapter: number;
  totalVerses: number;
}) {
  const [show, setShow] = useState(false);
  const [verse, setVerse] = useState<number>(1);

  useEffect(() => {
    // Show/hide based on whether the chapter title is above the viewport.
    const title = document.getElementById("chapter-title");
    if (!title) return;
    const titleObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // When the title's bottom is above the viewport top, show.
          const rect = e.boundingClientRect;
          setShow(rect.bottom < 0);
        }
      },
      { threshold: 0, rootMargin: "0px 0px 0px 0px" },
    );
    titleObserver.observe(title);
    return () => titleObserver.disconnect();
  }, []);

  useEffect(() => {
    // Track which verse is most prominently visible.
    const verses = Array.from(
      document.querySelectorAll<HTMLElement>("[id^='v']"),
    ).filter((el) => /^v\d+$/.test(el.id));
    if (verses.length === 0) return;

    // Map element id -> verse number
    const num = new Map<Element, number>();
    for (const v of verses) num.set(v, Number(v.id.slice(1)));

    let currentVerse = 1;
    const ratios = new Map<Element, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          ratios.set(e.target, e.intersectionRatio);
        }
        // Pick the verse with the largest intersection ratio.
        let best: Element | null = null;
        let bestRatio = 0;
        for (const [el, r] of ratios) {
          if (r > bestRatio) {
            bestRatio = r;
            best = el;
          }
        }
        if (best) {
          const n = num.get(best);
          if (n && n !== currentVerse) {
            currentVerse = n;
            setVerse(n);
          }
        }
      },
      {
        // Trigger when the verse is in the upper portion of the viewport.
        rootMargin: "-80px 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );
    verses.forEach((v) => obs.observe(v));
    return () => obs.disconnect();
  }, [bookName, chapter]);

  if (!show) return null;

  return (
    <div
      aria-hidden
      // Mobile-only: anchors under the 48px MobileTopBar on phones. Hidden on
      // desktop (md+), where the BookChapterSidebar already shows the book and
      // chapter, so this strip would only be redundant chrome over the reader.
      className="md:hidden fixed left-0 right-0 top-12 z-40 backdrop-blur-md bg-night/85 border-b border-paper/8"
    >
      <div className="mx-auto max-w-[1200px] px-5 md:px-10 py-2 flex items-center justify-between gap-3 font-sans text-caption">
        <span className="text-paper/85 font-semibold truncate">
          {bookName} {chapter}
        </span>
        <span className="text-paper/55 tabular-nums shrink-0">
          v {verse} of {totalVerses}
        </span>
      </div>
    </div>
  );
}
