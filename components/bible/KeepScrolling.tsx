"use client";

// Keep scrolling (1.7, the owner's "Do all of these" of 2026-10-15): at the
// foot of a chapter the next one waits, named, and a reader who keeps
// scrolling past the end is taken into it, no tap needed. The pager above
// still offers the tap. A reader who would rather stop at the end turns it
// off in the reader's settings (lib/reader/readingFlow.ts).
//
// It moves only on the reader's own scroll: a page that opens already at
// its end (a short chapter, a jump to the last verse) waits for a gesture,
// and the end has to be held a moment, so a bounce off the bottom does not
// turn the page.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { getBook, nextChapter } from "@/lib/bible/books";
import { useReadingFlow } from "@/lib/reader/readingFlow";
import { useReadingsFlow } from "@/lib/readings/flow";

/** How long the reader rests at the end before the next chapter opens. */
const HOLD_MS = 450;
/** A gesture this recent counts as the reader scrolling. */
const GESTURE_MS = 1500;

export function KeepScrolling({ slug, chapter, v }: { slug: string; chapter: number; v?: string }) {
  const { t } = useTranslate();
  const router = useRouter();
  const flow = useReadingFlow();
  // Today's readings lead on to their next reading, not the next chapter.
  const walk = useReadingsFlow();
  const walking = Boolean(walk && walk.items[walk.at]?.book === slug && walk.items[walk.at]?.chapter === chapter);
  const keepScrolling = flow.keepScrolling && !walking;
  const zone = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const [going, setGoing] = useState(false);

  const next = nextChapter(slug, chapter);
  const vq = next && v && getBook(next.slug)?.testament === "NT" ? `?v=${v}` : "";
  const href = next ? `/bible/${next.slug}/${next.chapter}${vq}` : null;

  useEffect(() => {
    if (!keepScrolling || !href) return;
    let lastGesture = 0;
    let raf = 0;
    let hold = 0;
    let done = false;
    let prefetched = false;
    const gesture = () => {
      lastGesture = performance.now();
    };
    const atEnd = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const check = () => {
      raf = 0;
      const el = zone.current;
      if (!el || done) return;
      const r = el.getBoundingClientRect();
      const seen = Math.max(0, Math.min(1, (window.innerHeight - r.top) / Math.max(1, r.height)));
      if (fill.current) fill.current.style.transform = `scaleX(${seen})`;
      if (seen > 0 && !prefetched) {
        prefetched = true;
        router.prefetch(href);
      }
      if (atEnd() && performance.now() - lastGesture < GESTURE_MS) {
        if (!hold) {
          hold = window.setTimeout(() => {
            hold = 0;
            if (done || !atEnd()) return;
            done = true;
            setGoing(true);
            router.push(href);
          }, HOLD_MS);
        }
      } else if (hold && !atEnd()) {
        window.clearTimeout(hold);
        hold = 0;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", gesture, { passive: true });
    window.addEventListener("touchmove", gesture, { passive: true });
    window.addEventListener("keydown", gesture);
    raf = requestAnimationFrame(check);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hold);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", gesture);
      window.removeEventListener("touchmove", gesture);
      window.removeEventListener("keydown", gesture);
    };
  }, [keepScrolling, href, router]);

  if (!keepScrolling || !next) return null;
  const name = `${t(`bible.books.${next.slug}`)} ${next.chapter}`;

  return (
    <div ref={zone} data-keep-scrolling className="mt-12 flex min-h-[62dvh] flex-col items-center pt-10 text-center" data-reader-chrome>
      <span aria-hidden className="relative block h-[2px] w-24 overflow-hidden rounded-full bg-paper/10">
        <span
          ref={fill}
          className="absolute inset-0 origin-left rounded-full bg-paper/70"
          style={{ transform: "scaleX(0)" }}
        />
      </span>
      <p className="mt-6 font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-paper/50">
        {going ? t("bible.keepScrolling.going") : t("bible.keepScrolling.eyebrow")}
      </p>
      <p className="mt-2 font-serif text-title text-paper/90">{name}</p>
      <p className="mt-2 max-w-[30ch] font-sans text-caption text-paper/45">{t("bible.keepScrolling.hint")}</p>
      <svg aria-hidden width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="mt-5 animate-bounce text-paper/40 [:where([data-motion=reduce])_&]:animate-none">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
