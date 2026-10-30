"use client";

import { useEffect, type ReactNode } from "react";

import { FONT_CLASSES, SIZE_CLASSES, useReaderPrefs } from "@/components/reader/ReaderPrefs";
import { ChaptersList } from "@/components/reading/ChaptersList";
import { MobileWorkPill, type ContentsSection } from "@/components/saints/MobileWorkPill";
import { clearPosition, loadPosition, savePosition } from "@/lib/reader/position";
import { inputSince, watchInput } from "@/lib/ui/lastInput";

/**
 * A council's document in the reading room's reader (1.8, the owner's pick
 * of r3-03: "every book opened in the room's reader, with its chapters, Start
 * reading and Continue"). Around the text the page writes (its sections, each
 * at its own address, #sN, which the quotations elsewhere in the app open):
 * the reader's own typeface and size, the same preferences the Bible and the
 * Fathers' works keep (components/reader/ReaderPrefs.tsx); the chapters at
 * the top, on every screen (components/reading/ChaptersList.tsx); the
 * section pill on a phone (components/saints/MobileWorkPill.tsx); and the
 * reader's place, kept on the device as a Father's work keeps it
 * (lib/reader/position.ts, under "councils/<its council>"), so the book's
 * Start reading becomes Continue, and coming back opens where they were.
 */
export function CouncilReader({
  positionKey,
  docSlug,
  sections,
  children,
}: {
  /** Where its place is kept: "councils/<council>", beside the Fathers' "<saint>". */
  positionKey: string;
  docSlug: string;
  sections: ContentsSection[];
  /** The text, written by the page: its sections, each with id `s<n>`. */
  children: ReactNode;
}) {
  const { size, font } = useReaderPrefs();
  const lastN = sections[sections.length - 1]?.n ?? 0;

  // Back where the reader left off, unless the address names a place (a
  // quotation opening its canon) or the reader has already started on their own.
  useEffect(() => {
    if (window.location.hash) return;
    watchInput();
    const opened = performance.now();
    const pos = loadPosition(positionKey, docSlug);
    if (!pos) return;
    if (pos.sectionN >= lastN) {
      // Finished: the next visit starts at the beginning, not at the end.
      clearPosition(positionKey, docSlug);
      return;
    }
    const frame = requestAnimationFrame(() => {
      if (inputSince(opened)) return;
      document.getElementById(`s${pos.sectionN}`)?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [positionKey, docSlug, lastN]);

  // The section most in view, kept a moment after the reader stops scrolling.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const ratios = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const m = /^s(\d+)$/.exec(e.target.id);
          if (m) ratios.set(Number(m[1]), e.intersectionRatio);
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-20% 0px -40% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(`s${s.n}`);
      if (el) observer.observe(el);
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        let best = 0;
        let bestRatio = 0;
        for (const [n, r] of ratios) {
          if (r > bestRatio) {
            bestRatio = r;
            best = n;
          }
        }
        if (best <= 0) return;
        if (best >= lastN) clearPosition(positionKey, docSlug);
        else savePosition(positionKey, docSlug, best);
      }, 800);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [positionKey, docSlug, sections, lastN]);

  return (
    <article data-council-reader="" className={`pb-24 safe-pb-reader ${FONT_CLASSES[font]} ${SIZE_CLASSES[size]}`}>
      <ChaptersList sections={sections} accordion={false} />
      {children}
      <MobileWorkPill sections={sections} />
    </article>
  );
}
