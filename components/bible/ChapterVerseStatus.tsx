"use client";

import { useEffect, useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { VERSE_ROWS, verseAtReadingPlace } from "@/lib/bible/verseInView";
import { cn } from "@/lib/cn";

/**
 * "v 11 of 42 · 3 min left", a running line over the chapter's pill at the
 * foot of the screen (1.8, MobileChapterPill), as a printed page carries its
 * place at its foot. It opens once the chapter title has scrolled away, and
 * follows the verse being read. It was the second line of the reader's top
 * bar from 1.7 until the bar went (the owner's pick B of round 2, "The page":
 * no bar at all); the pill, which comes back on a scroll up, names the
 * chapter now.
 *
 * It replaced ChapterStickyHeader, a strip of its own pinned under the bar
 * that repeated the book and chapter the bar already named. On a phone's
 * browser that strip pinned at 48px under a 72px web header and cut through
 * it (the owner's screenshot, 2026-10-01).
 *
 * The verse is the one over the reading line, the middle of what can be seen
 * between the bars (lib/bible/verseInView.ts): the same verse the Bible keeps
 * as the reader's place and a link lands on (1.8, the owner's note 68). It
 * was the one with the most of itself near the top of the screen, so a
 * return that landed on verse 16 read "v 14 of 36" over it. aria-hidden, as
 * the strip was: a counter rewriting itself as the page scrolls is noise to a
 * screen reader, and the chapter is already the bar's heading.
 */
/** Scripture read with attention, a little under the usual silent pace. */
const WORDS_A_MINUTE = 200;

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
  // Minutes still to read from the verse in view to the chapter's end
  // (1.7, the owner's yes of 2026-10-15). Null until the verse is known.
  const [minutes, setMinutes] = useState<number | null>(null);
  const [seen, setSeen] = useState(chapterKey);
  if (seen !== chapterKey) {
    setSeen(chapterKey);
    setShow(false);
    setVerse(1);
    setMinutes(null);
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

  // The verse over the reading line, as the page scrolls and as it opens.
  useEffect(() => {
    const verses = Array.from(document.querySelectorAll<HTMLElement>(VERSE_ROWS));
    if (verses.length === 0) return;
    // The words from each verse to the end, read from the English of each
    // row (the Greek beside it is not counted), or from a downloaded Bible's
    // (1.9, components/bible/DownloadedChapter.tsx).
    const wordsFrom = new Map<number, number>();
    let sum = 0;
    for (let i = verses.length - 1; i >= 0; i -= 1) {
      const text = verses[i].querySelector("p[data-own-press], p[data-verse-words]")?.textContent ?? "";
      sum += text.split(/\s+/).filter(Boolean).length;
      wordsFrom.set(Number(verses[i].id.slice(1)), sum);
    }
    let current = 1;
    let raf = 0;
    const settle = () => {
      raf = 0;
      const n = verseAtReadingPlace();
      if (n && n !== current) {
        current = n;
        setVerse(n);
        const words = wordsFrom.get(n) ?? 0;
        // Under a minute's reading left says nothing worth a line.
        setMinutes(words >= WORDS_A_MINUTE ? Math.round(words / WORDS_A_MINUTE) : null);
      }
    };
    // Once a frame at most, whatever moved the page.
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(settle);
    };
    raf = requestAnimationFrame(settle);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [chapterKey]);

  // A 0fr to 1fr row, so the line opens with its own height over the pill,
  // which holds its place at the foot, instead of jumping in. The words sit
  // on the page's own colour: the line floats over the verses, and with
  // nothing under it a screenshot of 2026-10-28 showed it written across one.
  // While it is open the fade under the pill is solid up to it (fresh eyes L2,
  // app/globals.css, the rule after .pill-fade): data-open says so.
  return (
    <span
      aria-hidden
      data-running-line=""
      data-open={show ? "" : undefined}
      className={cn(
        "grid max-w-full transition-[grid-template-rows,opacity] duration-300 ease-house motion-reduce:transition-none",
        show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <span className="max-w-full justify-self-center truncate rounded-pill bg-night px-2.5 py-0.5 font-sans text-eyebrow font-medium leading-[1.35] tabular-nums text-paper/60">
        {t("bible.verseOf", { verse, total: totalVerses })}
        {minutes ? ` · ${t("bible.minLeft", { min: minutes })}` : null}
      </span>
    </span>
  );
}
