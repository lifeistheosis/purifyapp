"use client";

// Jump to a tab by typing. Cmd+K, or Ctrl+K.
//
// The reference puts a search field in its top bar and so does every dense
// dashboard, but a search box that searches nothing is worse than no search
// box: it advertises a capability and then does not have it. This one has a
// finite, known corpus (the nav) and does the one thing worth doing with it,
// which is getting to a section without crossing the screen to the rail.
//
// Deliberately NOT a portal or a modal. A dialog over the panel would need
// focus trapping, a scrim, and an escape route, and it would cover the thing
// the operator is trying to get back to. An inline popover under the field
// costs none of that.

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchableTab = { id: string; label: string; eyebrow: string; group: string };

export function TabSearch({
  tabs,
  onSelect,
}: {
  tabs: SearchableTab[];
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const hits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return tabs.slice(0, 6);
    return tabs
      .filter((t) =>
        `${t.label} ${t.eyebrow} ${t.group}`.toLowerCase().includes(needle),
      )
      .slice(0, 6);
  }, [q, tabs]);

  // Cmd+K from anywhere in the panel. metaKey covers macOS, ctrlKey the rest.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // A click anywhere else closes the popover. Pointerdown rather than click so
  // it fires before the field can re-focus itself on the way through.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  function choose(id: string) {
    onSelect(id);
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    // min-w-0 with flex-1 is the pair that matters: flex-1 alone will not
    // shrink an input below its intrinsic size, so the row would still
    // overflow on a 320px phone. Fixed width returns at lg, where the bar has
    // room and a search field that grew to fill an ultrawide would look absurd.
    <div ref={boxRef} className="relative min-w-0 flex-1 lg:flex-none">
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--adm-ink-3)" }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.6" />
            <path d="M13.2 13.2 17 17" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Search sections"
          // Focus never leaves the input in a combobox, so without this the
          // arrow keys moved a highlight a screen reader could not see. The
          // operator heard the field and nothing else while the selection
          // walked the list under them.
          aria-activedescendant={open && hits[cursor] ? `${listId}-${hits[cursor].id}` : undefined}
          placeholder="Search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setCursor(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setCursor((c) => Math.min(hits.length - 1, c + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(0, c - 1));
            } else if (e.key === "Enter" && open && hits[cursor]) {
              e.preventDefault();
              choose(hits[cursor].id);
            }
          }}
          className="h-11 w-full rounded-[var(--adm-radius-sm)] border pl-9 pr-3 font-sans text-[12.5px] lg:w-[190px] lg:pr-14"
          style={{
            background: "var(--adm-control)",
            borderColor: "var(--adm-line)",
            color: "var(--adm-ink)",
          }}
        />
        {/* The shortcut hint, not a button. aria-hidden because a screen
            reader announcing "command K" inside a text field is noise. */}
        <span
          aria-hidden
          // Hidden on a phone, which has no meta key. It was costing 44px of
          // padding to advertise a shortcut that cannot be pressed.
          className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-[6px] border px-1.5 py-0.5 font-sans text-[10.5px] lg:block"
          style={{
            borderColor: "var(--adm-line)",
            background: "var(--adm-panel-2)",
            color: "var(--adm-ink-3)",
          }}
        >
          ⌘K
        </span>
      </div>

      {open && hits.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          // min() rather than a flat 280: the field can now be narrower than
          // its own results panel, and right-0 would push the left edge off a
          // 320px screen.
          className="adm-panel-enter absolute right-0 z-30 mt-1.5 w-[min(280px,calc(100vw-2rem))] overflow-hidden rounded-[var(--adm-radius)] border p-1"
          style={{
            background: "var(--adm-panel)",
            borderColor: "var(--adm-line-strong)",
            boxShadow: "var(--adm-shadow-pop)",
          }}
        >
          {/* The option IS the row. This used to be a <button> inside the
              <li role="option">, which puts an interactive element inside an
              option: the buttons were individually tabbable, so Tab walked the
              results while the combobox's own arrow-key cursor sat somewhere
              else entirely, and a reader had two conflicting accounts of where
              it was. A listbox is driven from the input; the row only needs to
              be clickable. */}
          {hits.map((t, i) => (
            // An option in a listbox is not its own keyboard target. The keys
            // are handled once, on the combobox input above, which is where
            // focus stays and what aria-activedescendant points from. Giving
            // the row its own handler would need it focusable, which is the
            // nested interactive element this markup was changed to remove.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={t.id}
              id={`${listId}-${t.id}`}
              role="option"
              aria-selected={i === cursor}
              onClick={() => choose(t.id)}
              onPointerEnter={() => setCursor(i)}
              className="adm-rail-item flex h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--adm-radius-sm)] px-2.5 text-left"
              style={
                i === cursor
                  ? { background: "var(--adm-nav-active-bg)", color: "var(--adm-ink)" }
                  : { color: "var(--adm-ink-2)" }
              }
            >
              <span className="min-w-0">
                <span className="block truncate font-sans text-[12.5px] font-medium">
                  {t.label}
                </span>
                <span
                  className="block truncate font-sans text-[11px]"
                  style={{ color: "var(--adm-ink-3)" }}
                >
                  {t.eyebrow}
                </span>
              </span>
              <span
                className="shrink-0 font-sans text-[10.5px]"
                style={{ color: "var(--adm-ink-3)" }}
              >
                {t.group}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
