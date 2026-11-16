"use client";

// A track's name on its one line, whole (build 98 note 2), in the reader's
// dock (components/bible/ReaderDock.tsx) and the mini player
// (components/prayers/NowPlayingBar.tsx): a name longer than its line glides
// slowly along it and begins again where it began, with no jump
// (lib/ui/titleGlide.ts). Only the words move; the line, the cover and the
// buttons stay. With motion reduced it stands still, ended by an ellipsis.
//
// The name keeps its own direction (dir="auto" on the run of words), as the
// dock's chapter row keeps an English part's name in its own: an English
// name in Arabic begins at the left and glides leftwards. Laid out in the
// page's direction it began at the right, so its first letters were cut and
// it glided from its end (Updates 98j's Arabic still, 2026-11-16). While it
// glides, the line takes the name's direction, so the name stands at its
// own start edge; while it fits, the line keeps the page's direction and the
// name stands at the line's start, beside the cover, as the chapter row's
// name stands at the row's start.

import { useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import { readsRtl } from "@/lib/marks/startEdge";
import { useReducedMotion } from "@/lib/ui/motion";
import { AWAY_ATTR } from "@/lib/ui/scrollAway";
import { GLIDE_GAP_PX, titleGlide } from "@/lib/ui/titleGlide";

/** Said to checkMock's cut rule: the name is read whole, by its glide. */
const GLIDE_WHY =
  "a long track name glides slowly along its line to show itself whole (lib/ui/titleGlide.ts); with motion reduced it stands still, and is read whole in the button's label and in Now Playing";

/** The dock's title: its type as drawn. */
const DOCK_TYPE = "font-sans text-[15px] font-semibold leading-tight text-paper";

/**
 * Whether the surface the line stands on is drawn in to its small pill (the
 * reader reading on, focus mode, the mini player drawn in): the line is
 * hidden and narrowing then, so it is not measured.
 */
function drawnIn(): boolean {
  const root = document.documentElement;
  return document.body.hasAttribute(AWAY_ATTR) || root.classList.contains("reader-focus") || root.classList.contains("now-playing-drawn");
}

export function GlideName({ text, className = DOCK_TYPE }: { text: string; className?: string }) {
  const reduced = useReducedMotion();
  const lineRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const line = lineRef.current;
    const run = line?.firstElementChild as HTMLElement | null;
    const name = run?.firstElementChild as HTMLElement | null;
    const copy = name?.nextElementSibling as HTMLElement | null;
    if (reduced || !line || !run || !name || !copy) return;
    let glide: Animation | null = null;
    let was = "";
    let wait = 0;
    const place = () => {
      if (drawnIn() || !line.clientWidth) return;
      // The name's own direction, from its words (the run's dir="auto").
      const rtl = readsRtl(run);
      const next = titleGlide(name.offsetWidth, line.clientWidth, rtl);
      // The direction is in `to`'s sign, so a name whose direction turns glides again from its start.
      const key = next ? `${next.to}` : "";
      if (key === was) return;
      was = key;
      glide?.cancel();
      glide = null;
      copy.hidden = !next;
      if (next) line.dir = rtl ? "rtl" : "ltr";
      else line.removeAttribute("dir");
      if (next) glide = run.animate(next.keyframes, { duration: next.duration, iterations: Infinity });
    };
    place();
    const sized = new ResizeObserver(() => {
      window.clearTimeout(wait);
      wait = window.setTimeout(place, 150);
    });
    sized.observe(line);
    sized.observe(name);
    return () => {
      sized.disconnect();
      window.clearTimeout(wait);
      glide?.cancel();
      copy.hidden = true;
      line.removeAttribute("dir");
    };
  }, [text, reduced]);

  if (reduced) {
    // At the line's start in the page's direction, its words and its ellipsis in their own.
    return (
      <span data-mock-allow="cut" data-mock-why={GLIDE_WHY} className={cn("block min-w-0", className)}>
        <span dir="auto" className="inline-block max-w-full truncate align-top">
          {text}
        </span>
      </span>
    );
  }
  return (
    <span ref={lineRef} data-mock-allow="cut" data-mock-why={GLIDE_WHY} className={cn("block overflow-hidden", className)}>
      <span dir="auto" className="flex w-max">
        <span className="whitespace-nowrap">{text}</span>
        <span aria-hidden hidden className="whitespace-nowrap" style={{ paddingInlineStart: GLIDE_GAP_PX }}>
          {text}
        </span>
      </span>
    </span>
  );
}
