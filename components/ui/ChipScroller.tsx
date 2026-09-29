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

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export function ChipScroller({
  label,
  children,
  className,
}: {
  /** Names the group for assistive technology, e.g. "By kind". */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ start: el.scrollLeft > 4, end: el.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.7), behavior: "smooth" });
  };

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        role="group"
        aria-label={label}
        onScroll={measure}
        className="-mx-5 flex snap-x scroll-px-5 gap-2.5 overflow-x-auto px-5 py-1 [scrollbar-width:none] md:-mx-8 md:scroll-px-8 md:px-8 [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 [&>*]:snap-start"
      >
        {children}
      </div>
      <Edge side="start" visible={edges.start} onClick={() => nudge(-1)} />
      <Edge side="end" visible={edges.end} onClick={() => nudge(1)} />
    </div>
  );
}

function Edge({
  side,
  visible,
  onClick,
}: {
  side: "start" | "end";
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 flex w-20 items-center transition-opacity duration-200",
        side === "start"
          ? "-left-5 justify-start bg-gradient-to-r from-night via-night/80 to-transparent pl-1 md:-left-8 md:pl-3"
          : "-right-5 justify-end bg-gradient-to-l from-night via-night/80 to-transparent pr-1 md:-right-8 md:pr-3",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        onClick={onClick}
        className={cn(
          "hidden size-11 items-center justify-center rounded-full border border-paper/20 bg-night/90 font-sans text-title-sm leading-none text-paper/80 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.6)] transition-colors hover:border-paper/40 hover:text-paper [@media(pointer:fine)]:inline-flex",
          visible ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        {side === "start" ? "‹" : "›"}
      </button>
    </div>
  );
}
