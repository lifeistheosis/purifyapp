"use client";

import { useEffect, useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

/**
 * "v 11 of 42", the second line of the reader's top bar (MobileTopBar's
 * `subtitle`). It opens beneath the chapter's name once the chapter title has
 * scrolled away, and follows the verse being read.
 *
 * It replaces ChapterStickyHeader, a strip of its own pinned under the bar
 * that repeated the book and chapter the bar already names. On a phone's
 * browser that strip pinned at 48px under a 72px web header and cut through
 * it (the owner's screenshot, 2026-10-01). One bar now carries both.
 *
 * The verse is the one most in view near the top of the reading area, read
 * from every `<div id="v{n}">` VerseRow renders. aria-hidden, as the strip
 * was: a counter rewriting itself as the page scrolls is noise to a screen
 * reader, and the chapter is already the bar's heading.
 */
export function ChapterVerseStatus({
  chapterKey,
  totalVerses,
}: {
  /** "luke/10". The bar outlives a move to the next chapter, so the
   *  observers re-bind to the new page's title and verses on this. */
  chapterKey: string;
  totalVerses: number;
}) {
  const { t } = useTranslate();
  const [show, setShow] = useState(false);
  const [verse, setVerse] = useState(1);
  const [seen, setSeen] = useState(chapterKey);
  if (seen !== chapterKey) {
    setSeen(chapterKey);
    setShow(false);
    setVerse(1);
  }

  // Open once the chapter title's bottom edge is above the viewport.
  useEffect(() => {
    const title = document.getElementById("chapter-title");
    if (!title) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setShow(e.boundingClientRect.bottom < 0);
      },
      { threshold: 0 },
    );
    obs.observe(title);
    return () => obs.disconnect();
  }, [chapterKey]);

  // The verse with the largest share of the band under the bar.
  useEffect(() => {
    const verses = Array.from(document.querySelectorAll<HTMLElement>("[id^='v']")).filter((el) =>
      /^v\d+$/.test(el.id),
    );
    if (verses.length === 0) return;
    const ratios = new Map<Element, number>();
    let current = 1;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.intersectionRatio);
        let best: Element | null = null;
        let bestRatio = 0;
        for (const [el, r] of ratios) {
          if (r > bestRatio) {
            bestRatio = r;
            best = el;
          }
        }
        const n = best ? Number(best.id.slice(1)) : 0;
        if (n && n !== current) {
          current = n;
          setVerse(n);
        }
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    verses.forEach((v) => obs.observe(v));
    return () => obs.disconnect();
  }, [chapterKey]);

  // A 0fr to 1fr row, so the line opens with its own height and the name above
  // it rises to make room instead of jumping.
  return (
    <span
      aria-hidden
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-house motion-reduce:transition-none",
        show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <span className="overflow-hidden font-sans text-eyebrow leading-[1.35] tabular-nums text-paper/55">
        {t("bible.verseOf", { verse, total: totalVerses })}
      </span>
    </span>
  );
}
