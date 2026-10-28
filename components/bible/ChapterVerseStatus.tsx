"use client";

import { useEffect, useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
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
 * The verse is the one most in view near the top of the reading area, read
 * from every `<div id="v{n}">` VerseRow renders. aria-hidden, as the strip
 * was: a counter rewriting itself as the page scrolls is noise to a screen
 * reader, and the chapter is already the bar's heading.
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

  // The verse with the largest share of the band under the bar.
  useEffect(() => {
    const verses = Array.from(document.querySelectorAll<HTMLElement>("[id^='v']")).filter((el) =>
      /^v\d+$/.test(el.id),
    );
    if (verses.length === 0) return;
    // The words from each verse to the end, read from the English of each
    // row (the Greek beside it is not counted).
    const wordsFrom = new Map<number, number>();
    let sum = 0;
    for (let i = verses.length - 1; i >= 0; i -= 1) {
      const text = verses[i].querySelector("p[data-own-press]")?.textContent ?? "";
      sum += text.split(/\s+/).filter(Boolean).length;
      wordsFrom.set(Number(verses[i].id.slice(1)), sum);
    }
    const ratios = new Map<Element, number>();
    let current = 1;
    const settle = () => {
      let best: Element | null = null;
      let bestRatio = 0;
      for (const [el, r] of ratios) {
        if (r > bestRatio) {
          bestRatio = r;
          best = el;
        }
      }
      // No verse in the band: the reader is past the last one (the foot of
      // the chapter, Keep scrolling), or jumped there without passing
      // through. The last verse above the band is where they are.
      let n = best ? Number(best.id.slice(1)) : 0;
      for (let i = verses.length - 1; !n && i >= 0; i -= 1) {
        if (verses[i].getBoundingClientRect().top < 80) n = Number(verses[i].id.slice(1));
      }
      if (n && n !== current) {
        current = n;
        setVerse(n);
        const words = wordsFrom.get(n) ?? 0;
        // Under a minute's reading left says nothing worth a line.
        setMinutes(words >= WORDS_A_MINUTE ? Math.round(words / WORDS_A_MINUTE) : null);
      }
    };
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) ratios.set(e.target, e.intersectionRatio);
        settle();
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    verses.forEach((v) => obs.observe(v));
    // A jump that lands where no verse was or is in the band changes no
    // verse's crossing, so the observer says nothing: the scroll asks too.
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        let any = false;
        for (const r of ratios.values()) if (r > 0) any = true;
        if (!any) settle();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, [chapterKey]);

  // A 0fr to 1fr row, so the line opens with its own height over the pill,
  // which holds its place at the foot, instead of jumping in.
  return (
    <span
      aria-hidden
      className={cn(
        "grid max-w-full transition-[grid-template-rows,opacity] duration-300 ease-house motion-reduce:transition-none",
        show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <span className="truncate font-sans text-eyebrow font-medium leading-[1.35] tabular-nums text-paper/60">
        {t("bible.verseOf", { verse, total: totalVerses })}
        {minutes ? ` · ${t("bible.minLeft", { min: minutes })}` : null}
      </span>
    </span>
  );
}
