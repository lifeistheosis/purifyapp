"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/cn";

/**
 * The ⋯ menu on a post and on a profile.
 *
 * It replaced a row of pills (Report, Block, Delete) that sat beside every
 * author's name: three words of moderation on every post in the feed, louder
 * than the post's own date. The actions are the same and one tap further.
 *
 * A button and a list, closed by a tap outside, by scrolling, by Escape
 * (which goes no further, so it does not also close a profile card
 * underneath) and by choosing an item. Focus moves into the list on open and
 * back to the button on Escape.
 *
 * The list is drawn at the top of the page, fixed beside its button, not
 * inside the post: post cards skip rendering while off screen
 * (content-visibility), which also clips anything that spills out of them, so
 * a list inside a short post would be cut off at its edge.
 */

export type ActionMenuItem = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
};

type Place = { top?: number; bottom?: number; right: number };

export function ActionMenu({
  label,
  items,
  className,
  size = "sm",
}: {
  /** The button's accessible name, e.g. "More actions". */
  label: string;
  items: ActionMenuItem[];
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  // Where the list goes: under the button, or above it near the bottom of
  // the screen. Measured before paint, so it never flashes in the wrong place.
  useLayoutEffect(() => {
    if (!open) return;
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const right = Math.max(8, window.innerWidth - r.right);
    const roomBelow = window.innerHeight - r.bottom;
    setPlace(roomBelow < 220 ? { bottom: window.innerHeight - r.top + 6, right } : { top: r.bottom + 6, right });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
    function onDown(e: PointerEvent) {
      const target = e.target as Node;
      if (listRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    // The list is fixed to the screen, so it closes rather than float away
    // from its post when the page moves.
    function onMove(e: Event) {
      if (listRef.current && e.target instanceof Node && listRef.current.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  if (items.length === 0) return null;

  // Escape closes the menu and goes no further, so a profile card under it
  // stays open.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={cn(
          "hit-44 inline-flex items-center justify-center rounded-pill text-paper/55 transition-colors hover:bg-paper/[0.07] hover:text-paper",
          size === "md" ? "size-9 border border-paper/15 bg-black/20 text-paper/80" : "size-8",
          open && "bg-paper/[0.08] text-paper",
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
          <circle cx="5.5" cy="12" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="18.5" cy="12" r="1.7" />
        </svg>
      </button>
      {open && place && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={listRef}
              id={listId}
              role="menu"
              aria-label={label}
              tabIndex={-1}
              onKeyDown={onKeyDown}
              className="fixed z-[95] min-w-[11rem] overflow-hidden rounded-xl border border-paper/15 bg-night-soft py-1 shadow-2xl"
              style={place}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={cn(
                    "block w-full whitespace-nowrap px-4 py-2.5 text-left font-sans text-detail font-medium transition-colors disabled:cursor-default disabled:opacity-55",
                    item.danger
                      ? "text-crimson-soft hover:bg-crimson/[0.12] focus-visible:bg-crimson/[0.12]"
                      : "text-paper/85 hover:bg-paper/[0.07] focus-visible:bg-paper/[0.07]",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
