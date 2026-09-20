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
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { useReducedMotion } from "@/lib/ui/motion";
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
 * The admin panel's one dropdown.
 *
 * WHY NOT THE NATIVE <select>. On Windows Chrome the open list is drawn by the
 * operating system: a white sheet with a light-blue highlight, on a dark panel,
 * in a font that is not the panel's. It was reported from the product editor's
 * Classification field as looking broken, and there were 22 of them across
 * eight files, each styled a little differently when closed and identically
 * wrong when open. SupportConsole had already written its own picker to get
 * away from it; this is that picker made general, so every field opens the
 * same way.
 *
 * THE PATTERN is the WAI-ARIA select-only combobox. Focus stays on the trigger
 * the whole time and the cursor is announced through aria-activedescendant, so
 * the Modal's focus trap never sees focus leave the dialog. The one exception
 * is the filter box on long lists, which takes focus so a phone can type into
 * it.
 *
 * THE MENU IS PORTALLED to <body>, carrying `.adm` so the theme tokens resolve
 * there too (the same reason Modal portals with `.adm`). Rendering it in place
 * clipped it inside every scrolling dialog body, which is where most of these
 * fields live.
 *
 * ESCAPE closes the menu and nothing else. The Modal listens for Escape on
 * window in the bubble phase, so without the capture listener below one press
 * closed the menu AND the product editor behind it, with the edit in it.
 *
 * ON A PHONE IT IS A SHEET, not a menu on its trigger (lib/ui/listbox.ts,
 * placeSheet). Anchored, a trigger low on a phone screen left a 100px window
 * holding 700px of options, and on a long list the filter box opened the
 * keyboard over what was left: reported 2026-09-19 as "not scrollable on
 * tablet or phone". The sheet sits above the keyboard, is measured against
 * the VISUAL viewport so it moves when the keyboard does, and its list
 * contains its own scrolling so a drag never runs the page underneath.
 */

export type SelectOption<V extends string = string> = {
  value: V;
  label: string;
  /** A quieter second line, for what the choice means. */
  hint?: string;
  /** A leading mark: an emoji, a status dot, a swatch. */
  icon?: ReactNode;
  disabled?: boolean;
  /** Consecutive options with the same group share one heading. */
  group?: string;
};

type Size = "sm" | "md";

const MENU_WANT = 320;
/** Below this width a coarse pointer gets the sheet rather than a menu. */
const SHEET_UNDER = 680;
const SEARCH_AT = 10;

export function Select<V extends string>({
  value,
  onChange,
  options,
  placeholder = "Choose…",
  size = "md",
  ariaLabel,
  ariaLabelledBy,
  id,
  disabled,
  className = "",
  searchable,
  align = "start",
  menuMinWidth = 200,
  pill,
}: {
  value: V | "" | null | undefined;
  onChange: (value: V) => void;
  options: readonly SelectOption<V>[];
  placeholder?: string;
  size?: Size;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  id?: string;
  disabled?: boolean;
  /** Width and layout for the trigger. Defaults to full width at md, auto at sm. */
  className?: string;
  /** A filter box on top of the list. On by default past ten options. */
  searchable?: boolean;
  align?: "start" | "end";
  menuMinWidth?: number;
  /** Rounded-pill trigger, for status pickers that sit in a header. */
  pill?: boolean;
}) {
  const reactId = useId();
  const listId = `${reactId}-list`;
  const optionId = (i: number) => `${reactId}-opt-${i}`;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const typed = useRef<{ buffer: string; at: number }>({ buffer: "", at: 0 });
  const reduced = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Placement | null>(null);

  const withSearch = searchable ?? options.length > SEARCH_AT;
  const visible = useMemo(
    () => (withSearch && query ? filterItems(options, query) : [...options]),
    [options, query, withSearch],
  );
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // A trigger scrolled fully out of its container is a menu pointing at
    // nothing. Closing is less surprising than a list floating free. The
    // sheet is not on its trigger, so it stays.
    const vv = window.visualViewport;
    const width = vv?.width ?? window.innerWidth;
    const height = window.innerHeight;
    // What the keyboard covers: the layout viewport still counts those pixels,
    // the visual one does not.
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
            minWidth: menuMinWidth,
            maxWidth: 440,
            align,
          }),
    );
  }, [align, menuMinWidth]);

  function openMenu(start?: "first" | "last" | number) {
    if (disabled) return;
    setQuery("");
    const all = options;
    const at =
      typeof start === "number"
        ? start
        : start === "first"
          ? edgeEnabled(all, "first")
          : start === "last"
            ? edgeEnabled(all, "last")
            : selectedIndex >= 0 && !all[selectedIndex]?.disabled
              ? selectedIndex
              : edgeEnabled(all, "first");
    setActive(at);
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

  // Keep the menu stuck to its trigger while anything scrolls (the dialog
  // body, the page, a table) and when the window changes size. Capture phase,
  // because scroll does not bubble and the scrolling box is rarely the window.
  useLayoutEffect(() => {
    if (!open) return;
    const onMove = (e: Event) => {
      // The list scrolling under the cursor is not the trigger moving.
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return;
      measure();
    };
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    // The keyboard opening does not resize the window, only the visual
    // viewport, and the sheet has to move with it.
    window.visualViewport?.addEventListener("resize", onMove);
    window.visualViewport?.addEventListener("scroll", onMove);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      window.visualViewport?.removeEventListener("resize", onMove);
      window.visualViewport?.removeEventListener("scroll", onMove);
    };
  }, [open, measure]);

  // Outside press and Escape. Both on window in the CAPTURE phase: Escape has
  // to be claimed before the Modal's own window listener closes the dialog.
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

  // The active row stays in view as the arrow keys walk past the fold.
  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // optionId is derived from a stable useId, so it is not a real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  // The filter box takes focus when the menu opens with one, so a phone can
  // type into it. Deferred a frame so the portal has mounted.
  useEffect(() => {
    if (!open || !withSearch) return;
    const f = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(f);
  }, [open, withSearch]);

  function onKeys(e: ReactKeyboardEvent<HTMLElement>, fromSearch = false) {
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
        e.preventDefault();
        openMenu(k === "ArrowUp" ? "last" : undefined);
      } else if (k === "Home" || k === "End") {
        e.preventDefault();
        openMenu(k === "Home" ? "first" : "last");
      } else if (k.length === 1 && /\S/.test(k) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Closed type-ahead changes nothing until the menu is open and a row
        // is chosen, which is what a native select does on Windows and what
        // keeps a stray keypress from silently rewriting a saved field.
        const hit = typeahead(options, k, selectedIndex);
        openMenu(hit >= 0 ? hit : undefined);
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
      case " ":
        if (fromSearch) return;
        e.preventDefault();
        choose(active);
        return;
      case "Tab":
        // Tab leaves. It must not leave the menu open behind it.
        close(false);
        return;
    }
    if (!fromSearch && k.length === 1 && /\S/.test(k) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = performance.now();
      const buf = now - typed.current.at < 600 ? typed.current.buffer + k : k;
      typed.current = { buffer: buf, at: now };
      const hit = typeahead(visible, buf, buf.length > 1 ? active - 1 : active);
      if (hit >= 0) setActive(hit);
    }
  }

  const pad = size === "sm" ? "px-2.5 py-1.5 text-[12.5px]" : "px-3 py-2 text-[13px]";
  const shape = pill ? "rounded-[var(--adm-radius-pill)]" : "rounded-[var(--adm-radius-sm)]";

  const menuStyle: CSSProperties | undefined = place
    ? {
        top: place.top,
        bottom: place.bottom,
        left: place.left,
        width: place.width,
        maxHeight: place.maxHeight,
        animation: reduced
          ? undefined
          : `${place.side === "below" ? "adm-select-down" : "adm-select-up"} 140ms var(--adm-ease) backwards`,
      }
    : undefined;

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 && !withSearch ? optionId(active) : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => onKeys(e)}
        data-empty={selected ? undefined : ""}
        className={
          `adm-select inline-flex min-w-0 items-center gap-2 border text-left font-sans outline-none ` +
          `disabled:cursor-not-allowed disabled:opacity-50 ${shape} ${pad} ` +
          (className || (size === "sm" ? "w-auto" : "w-full"))
        }
      >
        {selected?.icon ? (
          <span aria-hidden className="inline-flex shrink-0 items-center">
            {selected.icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 truncate">{selected ? selected.label : placeholder}</span>
        <Chevron open={open} />
      </button>

      {open && place && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="adm adm-select-menu fixed z-[130] flex flex-col overflow-hidden border font-sans"
              style={menuStyle}
            >
              {withSearch ? (
                <div className="shrink-0 border-b p-1.5" style={{ borderColor: "var(--adm-line)" }}>
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setActive(edgeEnabled(filterItems(options, e.target.value), "first"));
                    }}
                    onKeyDown={(e) => onKeys(e, true)}
                    placeholder="Type to filter"
                    aria-label="Filter options"
                    aria-controls={listId}
                    aria-activedescendant={active >= 0 ? optionId(active) : undefined}
                    className="w-full rounded-[8px] border px-2.5 py-1.5 text-[12.5px] outline-none"
                    style={{
                      borderColor: "var(--adm-line-strong)",
                      background: "var(--adm-control)",
                      color: "var(--adm-ink)",
                    }}
                  />
                </div>
              ) : null}
              <ul
                id={listId}
                role="listbox"
                aria-label={ariaLabel}
                aria-labelledby={ariaLabel ? undefined : ariaLabelledBy}
                // overscroll-contain: a drag that reaches the end of the
                // list must not start scrolling the page behind it, which on
                // a phone moved the whole menu out from under the thumb.
                // touch-action: pan-y claims the vertical drag for the list.
                className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain p-1"
              >
                {visible.length === 0 ? (
                  <li className="px-2.5 py-2 text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                    Nothing matches
                  </li>
                ) : null}
                {visible.map((o, i) => {
                  const isSel = o.value === value;
                  const isActive = i === active;
                  const heading = o.group && o.group !== visible[i - 1]?.group ? o.group : null;
                  return (
                    <SelectRow
                      key={o.value}
                      id={optionId(i)}
                      option={o}
                      heading={heading}
                      selected={isSel}
                      active={isActive}
                      onHover={() => !o.disabled && setActive(i)}
                      onPick={() => choose(i)}
                    />
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

function SelectRow<V extends string>({
  id,
  option,
  heading,
  selected,
  active,
  onHover,
  onPick,
}: {
  id: string;
  option: SelectOption<V>;
  heading: string | null;
  selected: boolean;
  active: boolean;
  onHover: () => void;
  onPick: () => void;
}) {
  return (
    <>
      {heading ? (
        <li
          role="presentation"
          className="px-2.5 pb-1 pt-2.5 text-[11px] font-medium first:pt-1"
          style={{ color: "var(--adm-ink-3)" }}
        >
          {heading}
        </li>
      ) : null}
      {/* The row is the option; keys belong to the trigger, where focus stays.
          Same reasoning as SupportConsole's picker and TabSearch. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events */}
      <li
        id={id}
        role="option"
        aria-selected={selected}
        aria-disabled={option.disabled || undefined}
        onPointerMove={onHover}
        onClick={onPick}
        className={
          "adm-select-row flex cursor-pointer select-none items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] leading-snug " +
          (option.disabled ? "cursor-not-allowed opacity-45" : "")
        }
        style={{
          background: active
            ? "color-mix(in oklab, var(--adm-accent), transparent 84%)"
            : undefined,
          color: selected || active ? "var(--adm-ink)" : "var(--adm-ink-2)",
        }}
      >
        {option.icon ? (
          <span aria-hidden className="inline-flex w-5 shrink-0 items-center justify-center">
            {option.icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className={"block truncate " + (selected ? "font-semibold" : "font-medium")}>
            {option.label}
          </span>
          {option.hint ? (
            <span className="mt-0.5 block text-[11.5px] leading-snug" style={{ color: "var(--adm-ink-3)" }}>
              {option.hint}
            </span>
          ) : null}
        </span>
        <span aria-hidden className="inline-flex w-4 shrink-0 justify-end" style={{ color: "var(--adm-accent-line)" }}>
          {selected ? <Check /> : null}
        </span>
      </li>
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 transition-transform duration-150"
      style={{ color: "var(--adm-ink-3)", transform: open ? "rotate(180deg)" : undefined }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Check() {
  return (
    <svg
      aria-hidden
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Options from a label table, the shape most admin enums already live in. */
export function optionsFrom<V extends string>(
  labels: Record<V, string>,
  extra?: Partial<Record<V, Omit<SelectOption<V>, "value" | "label">>>,
): SelectOption<V>[] {
  return (Object.keys(labels) as V[]).map((v) => ({ value: v, label: labels[v], ...(extra?.[v] ?? {}) }));
}
