"use client";

// One row that scrolls sideways, drawn the same way wherever it appears.
//
// Written for 1.5.2, when the owner asked for the shop's "scroll horizontal
// features" to be designed (2026-10-05). The rows it replaces were each a
// bare `overflow-x-auto` list: the last item was cut by the screen's edge
// with nothing to say the row went on, `scrollbar-thin` drew a 6px bar under
// every one of them on Android, and a row opened at its start even when the
// item the reader was on sat off screen to the right.
//
// What a rail does:
//   - No scrollbar. The row fades into the page at whichever end has more to
//     show, so a cut-off item reads as "there is more" and not as a mistake.
//   - The current item is brought to the middle when the row appears, and
//     glides there when it changes (`current`).
//   - On a pointer device the fades carry arrow buttons. They are a mouse
//     convenience, hidden from assistive technology and from the tab order:
//     every item is itself focusable, and a focused item scrolls into view.
//   - Sideways scrolling stays in the row (`overscroll-x-contain`), so a
//     swipe that reaches the end does not turn into the browser's back.
//
// The fades are two small painted elements, not a CSS mask: a mask on a
// scroller is one more surface for a phone to composite on every frame, and
// the shop is where the scrolling was already slow.
//
// The edge state is written straight to the element (data-more-start,
// data-more-end) rather than held in React state, so scrolling a rail
// re-renders nothing.

import { useCallback, useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { scrollBehavior } from "@/lib/ui/motion";

/** How close to an end, in px, still counts as being at it. */
const EDGE = 6;

export function ScrollRail({
  children,
  label,
  current,
  as: Tag = "div",
  role,
  className,
  trackClassName,
  fade = "from-night",
  arrows = true,
  snap = false,
}: {
  children: ReactNode;
  /** Names the row for assistive technology. */
  label?: string;
  /**
   * What the reader is on (a slug, an id). When it changes, the item marked
   * `aria-current`, `aria-selected="true"` or `data-current` is centred.
   */
  current?: string | null;
  /** The scrolling element: a `ul` for a list of links, a `div` otherwise. */
  as?: "div" | "ul";
  role?: string;
  /** The wrapper. Bleed and outer spacing go here. */
  className?: string;
  /** The scrolling row: its gap and its inner padding. */
  trackClassName?: string;
  /** The page colour under the row, as a gradient `from-*` class. */
  fade?: string;
  /** Arrow buttons on a pointer device. Off for a short or dense row. */
  arrows?: boolean;
  /** Settle on an item when the scroll stops. For rows of cards. */
  snap?: boolean;
}) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const track = useRef<HTMLElement | null>(null);
  const settled = useRef(false);

  const measure = useCallback(() => {
    const el = track.current;
    const box = wrap.current;
    if (!el || !box) return;
    const max = el.scrollWidth - el.clientWidth;
    // scrollLeft runs negative in a right-to-left row.
    const at = Math.abs(el.scrollLeft);
    box.toggleAttribute("data-more-start", at > EDGE);
    box.toggleAttribute("data-more-end", at < max - EDGE);
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // The items arriving, or changing width when a font lands, moves the end.
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [measure, children]);

  // Bring the current item to the middle: at once when the row first appears,
  // gliding when the reader moves from one to another.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(
      '[aria-current]:not([aria-current="false"]), [aria-selected="true"], [data-current]',
    );
    if (!target) {
      settled.current = true;
      return;
    }
    const row = el.getBoundingClientRect();
    const item = target.getBoundingClientRect();
    const delta = item.left + item.width / 2 - (row.left + row.width / 2);
    if (Math.abs(delta) > 1) {
      // Gliding follows the motion switch (lib/ui/motion.ts), like every
      // other scroll the app starts.
      el.scrollBy({ left: delta, behavior: settled.current ? scrollBehavior() : ("instant" as ScrollBehavior) });
    }
    settled.current = true;
    measure();
  }, [current, measure]);

  const nudge = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * Math.round(el.clientWidth * 0.7), behavior: scrollBehavior() });
  };

  return (
    <div ref={wrap} className={cn("group/rail relative", className)}>
      <Tag
        // One ref for either element: both are HTMLElements.
        ref={track as never}
        role={role}
        aria-label={label}
        onScroll={measure}
        className={cn(
          "flex overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0",
          snap && "snap-x snap-proximity [&>*]:snap-start",
          trackClassName,
        )}
      >
        {children}
      </Tag>
      <RailEdge side="start" fade={fade} arrows={arrows} onClick={() => nudge(-1)} />
      <RailEdge side="end" fade={fade} arrows={arrows} onClick={() => nudge(1)} />
    </div>
  );
}

function RailEdge({
  side,
  fade,
  arrows,
  onClick,
}: {
  side: "start" | "end";
  fade: string;
  arrows: boolean;
  onClick: () => void;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 flex w-12 items-center opacity-0 transition-opacity duration-200 to-transparent",
        fade,
        side === "start"
          ? "start-0 justify-start bg-gradient-to-r group-data-[more-start]/rail:opacity-100 rtl:bg-gradient-to-l"
          : "end-0 justify-end bg-gradient-to-l group-data-[more-end]/rail:opacity-100 rtl:bg-gradient-to-r",
      )}
    >
      {arrows ? (
        <button
          type="button"
          tabIndex={-1}
          onClick={onClick}
          className={cn(
            "hidden size-9 items-center justify-center rounded-full border border-paper/20 bg-night/90 font-sans text-lede leading-none text-paper/80 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.6)] transition-colors hover:border-paper/40 hover:text-paper [@media(pointer:fine)]:inline-flex",
            side === "start"
              ? "group-data-[more-start]/rail:pointer-events-auto"
              : "group-data-[more-end]/rail:pointer-events-auto",
          )}
        >
          <span className="rtl:-scale-x-100">{side === "start" ? "‹" : "›"}</span>
        </button>
      ) : null}
    </div>
  );
}
