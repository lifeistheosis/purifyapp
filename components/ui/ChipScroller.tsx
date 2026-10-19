"use client";

// One row of filter chips that scrolls sideways instead of wrapping.
//
// Written 2026-09-28 for the Saints filters, where sixteen kinds wrapped into
// three rows on an iPad and pushed the first saint below the fold. The row
// bleeds to the screen edge on a phone (the page's 20px gutter becomes scroll
// padding) and fades at whichever end has more to show. On a pointer device
// the fades carry arrow buttons; they are mouse conveniences only, hidden
// from assistive technology and the tab order, because every chip is itself
// focusable and a focused chip scrolls into view.
//
// The Bible reader's chapter strip is one too (1.7): a row inside the text's
// column on a tablet, which bleeds only where the column is the screen
// (`bleed="phone"`), opens with the chapter being read in the middle
// (`centerOn`), and sets its chips closer (`gap`).
//
// 1.7.2: the fades are shared with the saints' century timeline
// (useScrollEdges and ScrollEdge, below), they and their arrows follow a
// right-to-left row, and a row can click in the hand as it is scrolled
// (`ticks`, lib/ui/scrollTicks.ts), which the chapter strip does.

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { cn } from "@/lib/cn";
import { scrollBehavior } from "@/lib/ui/motion";
import { useScrollTicks } from "@/lib/ui/scrollTicks";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";

export function ChipScroller({
  label,
  children,
  className,
  gap = "gap-2.5",
  bleed = "always",
  centerOn,
  ticks = false,
}: {
  /** Names the group for assistive technology, e.g. "By kind". */
  label: string;
  children: ReactNode;
  className?: string;
  /** The space between chips, as a gap class. */
  gap?: string;
  /**
   * "always": the row runs past the page's padding to the screen's edge at
   * every width. "phone": only below md, for a row that sits in a centred
   * column on a tablet, whose edge is not the screen's.
   */
  bleed?: "always" | "phone";
  /**
   * Opens with the child marked aria-current in the middle of the row, and
   * again whenever this value changes (the chapter being read).
   */
  centerOn?: string | number;
  /** A small click in the hand for each chip scrolled past, in the phone apps. */
  ticks?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { edges, measure } = useScrollEdges(ref);
  useScrollTicks(ref, { enabled: ticks });

  useEffect(() => {
    if (centerOn === undefined) return;
    const el = ref.current;
    const current = el?.querySelector<HTMLElement>("[aria-current]");
    if (!el || !current) return;
    const row = el.getBoundingClientRect();
    const chip = current.getBoundingClientRect();
    el.scrollLeft += chip.left - row.left - (row.width - chip.width) / 2;
    measure();
  }, [centerOn, measure]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        role="group"
        aria-label={label}
        className={cn(
          "-mx-5 flex snap-x scroll-px-5 overflow-x-auto px-5 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 [&>*]:snap-start",
          bleed === "always" ? "md:-mx-8 md:scroll-px-8 md:px-8" : "md:mx-0 md:scroll-px-0 md:px-0",
          gap,
        )}
      >
        {children}
      </div>
      <ScrollEdge side="start" bleed={bleed} visible={edges.start} row={ref} />
      <ScrollEdge side="end" bleed={bleed} visible={edges.end} row={ref} />
    </div>
  );
}

/**
 * Whether a sideways row has more to show at either end. Only a change
 * renders, so scrolling through the middle of a row renders nothing.
 */
export function useScrollEdges(ref: RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // scrollLeft runs negative in a right-to-left row.
    const at = Math.abs(el.scrollLeft);
    const start = at > 4;
    const end = at < max - 4;
    setEdges((was) => (was.start === start && was.end === end ? was : { start, end }));
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [ref, measure]);

  return { edges, measure };
}

/**
 * The fade at one end of a sideways row, where it has more to show, with an
 * arrow for a mouse. It sits outside the row, in the row's wrapper, which is
 * `relative`; `bleed` is how far the row runs past the page's padding.
 */
export function ScrollEdge({
  side,
  bleed,
  visible,
  row,
}: {
  side: "start" | "end";
  bleed: "always" | "phone";
  visible: boolean;
  row: RefObject<HTMLElement | null>;
}) {
  const nudge = () => {
    const el = row.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const dir = (side === "start" ? -1 : 1) * (rtl ? -1 : 1);
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.7), behavior: scrollBehavior() });
  };
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 flex w-20 items-center motion-safe:transition-opacity motion-safe:duration-200",
        side === "start"
          ? cn(
              "-start-5 justify-start bg-gradient-to-r from-night via-night/80 to-transparent ps-1 rtl:bg-gradient-to-l",
              bleed === "always" ? "md:-start-8 md:ps-3" : "md:start-0 md:ps-0",
            )
          : cn(
              "-end-5 justify-end bg-gradient-to-l from-night via-night/80 to-transparent pe-1 rtl:bg-gradient-to-r",
              bleed === "always" ? "md:-end-8 md:pe-3" : "md:end-0 md:pe-0",
            ),
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        onClick={nudge}
        className={cn(
          "hidden size-11 items-center justify-center rounded-full border border-paper/20 bg-night/90 font-sans text-title-sm leading-none text-paper/80 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.6)] transition-colors hover:border-paper/40 hover:text-paper [@media(pointer:fine)]:inline-flex",
          visible ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        {side === "start" ? <ChevronLeft size={16} className="rtl:-scale-x-100" /> : <ChevronLeft size={16} className="-scale-x-100 rtl:scale-x-100" />}
      </button>
    </div>
  );
}
