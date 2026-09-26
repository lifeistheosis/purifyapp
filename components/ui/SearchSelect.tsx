"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import {
  edgeEnabled,
  filterItems,
  placeMenu,
  placeSheet,
  stepEnabled,
  typeahead,
  type Placement,
} from "@/lib/ui/listbox";

/**
 * A long list you can search, for reader-facing pages.
 *
 * ── Why this exists (2026-09-25) ─────────────────────────────────────────
 *
 * The patron saint picker was a bare <select> holding 158 saints. The closed
 * control carried Purify's border, and the moment it opened the list became
 * the operating system's: its blue highlight, its scrollbar, its type, none of
 * it reachable from our tokens, and on a phone a full-height wheel of 158
 * rows with no way to search. The admin panel had already solved this in
 * components/admin/Select.tsx, keyboard, type-ahead, sheet on a phone and a
 * filter, but styled with admin-only classes that do not exist on reader
 * pages. This is the same machine in the reader's clothes. The arithmetic
 * (lib/ui/listbox.ts) is shared, and tested there.
 *
 * The filter matches ANYWHERE in the name, accents off, so "egypt" finds St.
 * Mary of Egypt and "theo" finds Théophane. Type-ahead alone only matches the
 * start, which would make a reader know how the list files a saint.
 *
 * Keys stay on the trigger (or the filter box); rows are never focused, same
 * as the admin picker. Escape closes, Tab leaves, Home and End jump.
 */

export type SearchSelectOption<V extends string = string> = {
  value: V;
  label: string;
  hint?: string;
  disabled?: boolean;
};

const MENU_WANT = 360;
const SHEET_UNDER = 680;

export function SearchSelect<V extends string>({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  searchPlaceholder,
  emptyLabel,
  disabled,
}: {
  value: V | "" | null | undefined;
  onChange: (value: V) => void;
  options: readonly SearchSelectOption<V>[];
  placeholder: string;
  ariaLabel: string;
  /** Placeholder for the filter box. */
  searchPlaceholder: string;
  /** Shown when the filter matches nothing. */
  emptyLabel: string;
  disabled?: boolean;
}) {
  const reactId = useId();
  const listId = `${reactId}-list`;
  const optionId = (i: number) => `${reactId}-opt-${i}`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Placement | null>(null);

  const visible = useMemo(() => (query ? filterItems(options, query) : [...options]), [options, query]);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vv = window.visualViewport;
    const width = vv?.width ?? window.innerWidth;
    const height = window.innerHeight;
    // What the on-screen keyboard covers: the layout viewport still counts
    // those pixels, the visual one does not.
    const keyboard = vv ? Math.max(0, height - vv.height - vv.offsetTop) : 0;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const asSheet = coarse && width < SHEET_UNDER;
    if (!asSheet && (r.bottom < 0 || r.top > height)) {
      setOpen(false);
      return;
    }
    setPlace(
      asSheet
        ? placeSheet({ viewport: { width, height }, keyboard })
        : placeMenu({
            trigger: { top: r.top, bottom: r.bottom, left: r.left, width: r.width },
            viewport: { width, height: height - keyboard },
            want: MENU_WANT,
            minWidth: 260,
            maxWidth: 520,
            align: "start",
          }),
    );
  }, []);

  function openMenu() {
    if (disabled) return;
    setQuery("");
    setActive(
      selectedIndex >= 0 && !options[selectedIndex]?.disabled ? selectedIndex : edgeEnabled(options, "first"),
    );
    measure();
    setOpen(true);
  }

  function close(refocus = true) {
    setOpen(false);
    setQuery("");
    if (refocus) triggerRef.current?.focus();
  }

  function choose(i: number) {
    const opt = visible[i];
    if (!opt || opt.disabled) return;
    if (opt.value !== value) onChange(opt.value);
    close();
  }

  // Stay on the trigger while anything scrolls or the keyboard moves.
  useLayoutEffect(() => {
    if (!open) return;
    const onMove = (e: Event) => {
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return;
      measure();
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    window.visualViewport?.addEventListener("resize", onMove);
    window.visualViewport?.addEventListener("scroll", onMove);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      window.visualViewport?.removeEventListener("resize", onMove);
      window.visualViewport?.removeEventListener("scroll", onMove);
    };
  }, [open, measure]);

  // A press outside closes; Escape closes and returns focus.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
      setQuery("");
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      setQuery("");
      triggerRef.current?.focus();
    }
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  // Keep the active row in view as the arrows walk past the fold.
  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId comes from a stable useId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  // The filter box takes focus as the list opens, so a phone can type into it.
  useEffect(() => {
    if (!open) return;
    const f = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(f);
  }, [open]);

  function onKeys(e: ReactKeyboardEvent<HTMLElement>, fromSearch = false) {
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
        e.preventDefault();
        openMenu();
      } else if (k.length === 1 && /\S/.test(k) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Start filtering with the first letter typed on the closed control.
        e.preventDefault();
        openMenu();
        setQuery(k);
        setActive(edgeEnabled(filterItems(options, k), "first"));
      }
      return;
    }
    switch (k) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => stepEnabled(visible, a, 1));
        return;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => stepEnabled(visible, a, -1));
        return;
      case "PageDown":
        e.preventDefault();
        setActive((a) => stepEnabled(visible, a, 8));
        return;
      case "PageUp":
        e.preventDefault();
        setActive((a) => stepEnabled(visible, a, -8));
        return;
      case "Home":
        if (fromSearch) return;
        e.preventDefault();
        setActive(edgeEnabled(visible, "first"));
        return;
      case "End":
        if (fromSearch) return;
        e.preventDefault();
        setActive(edgeEnabled(visible, "last"));
        return;
      case "Enter":
        e.preventDefault();
        choose(active);
        return;
      case "Tab":
        close(false);
        return;
    }
    if (!fromSearch && k.length === 1 && /\S/.test(k) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const hit = typeahead(visible, k, active);
      if (hit >= 0) setActive(hit);
    }
  }

  const menuStyle: CSSProperties | undefined = place
    ? { top: place.top, bottom: place.bottom, left: place.left, width: place.width, maxHeight: place.maxHeight }
    : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => onKeys(e)}
        className="flex w-full min-w-0 items-center gap-3 rounded-md border border-paper/20 bg-night px-3.5 py-2.5 text-left font-sans text-ui text-paper outline-none transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none hover:border-paper/40 focus-visible:border-paper/60 focus-visible:ring-2 focus-visible:ring-paper/25 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={"min-w-0 flex-1 truncate " + (selected ? "text-paper" : "text-paper/55")}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          aria-hidden
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-paper/50 transition-transform [transition-duration:var(--duration-fast)] motion-reduce:transition-none"
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && place && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[130] flex flex-col overflow-hidden rounded-xl border border-paper/15 bg-night-soft font-sans shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]"
              style={menuStyle}
            >
              <div className="shrink-0 border-b border-paper/10 p-2">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(edgeEnabled(filterItems(options, e.target.value), "first"));
                  }}
                  onKeyDown={(e) => onKeys(e, true)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                  aria-controls={listId}
                  aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                  // 16px on phones: iOS Safari zooms the page for anything smaller.
                  className="w-full rounded-md border border-paper/15 bg-night px-3 py-2 text-[16px] text-paper outline-none placeholder:text-paper/40 focus:border-paper/40 md:text-detail"
                />
              </div>
              <ul
                id={listId}
                role="listbox"
                aria-label={ariaLabel}
                // A drag that reaches the end of the list must not scroll the
                // page behind it; pan-y claims the vertical drag for the list.
                className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-1.5"
              >
                {visible.length === 0 ? (
                  <li className="px-3 py-3 text-detail text-paper/55">{emptyLabel}</li>
                ) : null}
                {visible.map((o, i) => {
                  const isSel = o.value === value;
                  const isActive = i === active;
                  return (
                    // The row is the option; keys belong to the trigger or the
                    // filter box, where focus stays.
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                    <li
                      key={o.value}
                      id={optionId(i)}
                      role="option"
                      aria-selected={isSel}
                      aria-disabled={o.disabled || undefined}
                      onPointerMove={() => !o.disabled && setActive(i)}
                      onClick={() => choose(i)}
                      className={
                        "flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-detail leading-snug " +
                        (isActive ? "bg-paper/10 text-paper" : isSel ? "text-paper" : "text-paper/80") +
                        (o.disabled ? " cursor-not-allowed opacity-45" : "")
                      }
                    >
                      <span className="min-w-0 flex-1">
                        <span className={"block truncate " + (isSel ? "font-semibold" : "")}>{o.label}</span>
                        {o.hint ? <span className="mt-0.5 block truncate text-caption text-paper/50">{o.hint}</span> : null}
                      </span>
                      <span aria-hidden className="inline-flex w-4 shrink-0 justify-end text-paper/80">
                        {isSel ? (
                          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
