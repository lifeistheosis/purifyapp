"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { VERSE_ROWS, verseAtReadingPlace } from "@/lib/bible/verseInView";
import { cn } from "@/lib/cn";
import { gliding, landingDue, onLanded } from "@/lib/ui/readingPlace";

// On the server there is no page to read, and useLayoutEffect only warns.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

  // Open once the chapter title's bottom edge is above the viewport, and the
  // verse over the reading line, as the page scrolls and as it opens. Both are
  // read in the frame the page moved, before it is painted, and set in it
  // (flushSync), so the line is never drawn a frame behind the page: an
  // observer told it a frame late, and the line opened, with the fade under
  // the pill rising 52px to it, a frame after a verse link had landed (Gate
  // 3c, group 8). While the page glides to the verse a link named, a shut
  // line waits for the end and opens once, with that verse's words (group 5;
  // lib/ui/readingPlace.ts, gliding). A verse link's landing tells the line
  // itself, in the landing's own microtask (or frame, with motion on), and a
  // shut line waits for it while it is due: told by the scroll's event, the
  // line settled after every other frame callback, and a read in that frame
  // found the chapter at its verse with the line shut, or with the words read
  // at the scroll of the page left (Updates 91; readingPlace.ts, goOnArrival).
  useIsoLayoutEffect(() => {
    const title = document.getElementById("chapter-title");
    const verses = Array.from(document.querySelectorAll<HTMLElement>(VERSE_ROWS));
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
    let open = false;
    let current = 1;
    let raf = 0;
    const settle = (apply: (set: () => void) => void) => {
      raf = 0;
      if (!open && gliding()) return;
      if (!open && landingDue()) return;
      const nowOpen = title ? title.getBoundingClientRect().bottom < 0 : false;
      const n = verseAtReadingPlace();
      const moved = verses.length > 0 && !!n && n !== current;
      if (nowOpen === open && !moved) return;
      apply(() => {
        if (nowOpen !== open) {
          open = nowOpen;
          setShow(nowOpen);
        }
        if (n && moved) {
          current = n;
          setVerse(n);
          const words = wordsFrom.get(n) ?? 0;
          // Under a minute's reading left says nothing worth a line.
          setMinutes(words >= WORDS_A_MINUTE ? Math.round(words / WORDS_A_MINUTE) : null);
        }
      });
    };
    // Once a frame at most, whatever moved the page.
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(() => settle(flushSync));
    };
    // Before the first paint: a page that opens already scrolled opens its line with it.
    settle((set) => set());
    // The landing, just after it has moved the page: settled now, so the
    // frame that first shows the chapter at its verse shows the line with it.
    const stopHearing = onLanded(() => {
      cancelAnimationFrame(raf);
      settle(flushSync);
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      stopHearing();
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
