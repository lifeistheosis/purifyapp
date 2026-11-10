"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useReadingFlow } from "@/lib/reader/readingFlow";
import type { SectionHead } from "@/lib/saints/parts";

import { usePartWords } from "./partWords";
import { textDir } from "@/lib/i18n/textDir";

/** How long the reader rests at the end before the next chapter opens. */
const HOLD_MS = 450;
/** A gesture this recent counts as the reader scrolling. */
const GESTURE_MS = 1500;

/**
 * The next chapter of a work, waiting under the last line (1.8, the owner's
 * pick A of r3-29), as the Bible's next chapter waits (components/bible/
 * KeepScrolling.tsx): its name, its own title in italic, and, for a reader
 * who keeps scrolling past the end, the turn of the page with no tap, in the
 * same page (its address, #sN). The Bible's setting turns it off for both
 * (lib/reader/readingFlow.ts); the pill's arrow and the contents still turn
 * the page. It moves only on the reader's own scroll, and the end has to be
 * held a moment, so a bounce off the bottom does not turn the page.
 */
export function KeepReading({ next, onGo }: { next: SectionHead | null; onGo: (n: number) => void }) {
  const { t } = useTranslate();
  const { pill } = usePartWords();
  const flow = useReadingFlow();
  const zone = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const [going, setGoing] = useState<number | null>(null);
  const on = flow.keepScrolling && Boolean(next);
  const to = next?.n ?? null;

  useEffect(() => {
    if (!on || to === null) return;
    let lastGesture = 0;
    let raf = 0;
    let hold = 0;
    let done = false;
    const atEnd = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const check = () => {
      raf = 0;
      const el = zone.current;
      if (!el || done) return;
      const r = el.getBoundingClientRect();
      const seen = Math.max(0, Math.min(1, (window.innerHeight - r.top) / Math.max(1, r.height)));
      if (fill.current) fill.current.style.transform = `scaleX(${seen})`;
      if (atEnd() && performance.now() - lastGesture < GESTURE_MS) {
        if (!hold) {
          hold = window.setTimeout(() => {
            hold = 0;
            if (done || !atEnd()) return;
            done = true;
            setGoing(to);
            onGo(to);
          }, HOLD_MS);
        }
      } else if (hold && !atEnd()) {
        window.clearTimeout(hold);
        hold = 0;
      }
    };
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(check);
    }
    // A pull at the very end moves nothing, so it fires no scroll event: the
    // gesture itself asks for a look as well.
    const gesture = () => {
      lastGesture = performance.now();
      onScroll();
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
  }, [on, to, onGo]);

  if (!on || !next) return null;
  // A name of the work's own is English; one from the catalog is the reader's.
  const nextLang = "text" in next.pill.name ? "en" : undefined;
  return (
    <div ref={zone} data-keep-reading="" className="mt-12 flex min-h-[62dvh] flex-col items-center pt-10 text-center" data-reader-chrome>
      <span aria-hidden className="relative block h-[2px] w-24 overflow-hidden rounded-full bg-paper/10">
        <span ref={fill} className="absolute inset-0 origin-left rounded-full bg-paper/70" style={{ transform: "scaleX(0)" }} />
      </span>
      <p lang={nextLang} dir={textDir(nextLang)} className="mt-6 font-serif text-title text-paper/90">
        {pill(next)}
      </p>
      {next.caption ? (
        <p lang="en" dir="ltr" className="mt-2.5 max-w-[31ch] text-balance font-serif text-[16px] italic leading-[1.45] text-paper/65">
          {next.caption}
        </p>
      ) : null}
      <p className="mt-3 max-w-[30ch] font-sans text-caption text-paper/50">
        {going === next.n ? t("bible.keepScrolling.going") : t("bible.keepScrolling.hint")}
      </p>
      <svg aria-hidden width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="mt-5 text-paper/40 motion-safe:animate-[scroller-nudge_2.4s_ease-in-out_infinite]">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}
