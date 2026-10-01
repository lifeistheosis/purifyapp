"use client";

import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * The ⋯ menu on a post and on a profile.
 *
 * It replaced a row of pills (Report, Block, Delete) that sat beside every
 * author's name: three words of moderation on every post in the feed, louder
 * than the post's own date. The actions are the same and one tap further.
 *
 * A button and a list, closed by a tap outside, by Escape (which goes no
 * further, so it does not also close a profile card underneath) and by
 * choosing an item. Focus moves into the list on open and back to the button
 * on Escape.
 */

export type ActionMenuItem = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
};

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
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
    function onDown(e: PointerEvent) {
      const target = e.target as Node;
      if (listRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
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
      {open ? (
        <div
          ref={listRef}
          id={listId}
          role="menu"
          aria-label={label}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="absolute right-0 top-full z-40 mt-1.5 min-w-[11rem] overflow-hidden rounded-xl border border-paper/15 bg-night-soft py-1 shadow-2xl"
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
        </div>
      ) : null}
    </div>
  );
}
