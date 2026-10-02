"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { mentionAt } from "@/lib/community/mentions";
import { searchHandles } from "@/lib/profile/client";

/**
 * A text box that suggests @handles while one is being typed.
 *
 * Type "@ma" and up to six handles that start with it appear under the box,
 * readers you follow first (app/api/community/handles). Arrow keys move,
 * Enter or Tab puts the handle in, Escape closes the list. Handles only, no
 * names: a stored name can still be the first half of an email address.
 *
 * One component for the composer's textareas and the reply's single line,
 * so a mention works the same wherever a reader writes.
 */

type Shared = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  fieldRef?: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
};

export function MentionField(props: Shared & ({ as: "textarea"; rows?: number } | { as: "input" })) {
  const { t } = useTranslate();
  const { value, onChange, onKeyDown, fieldRef, className, placeholder, maxLength } = props;
  const [at, setAt] = useState<{ start: number; query: string } | null>(null);
  const [hits, setHits] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const ownRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const ref = fieldRef ?? ownRef;
  const listId = useId();
  const query = at?.query ?? "";

  // Ask once the typing pauses; a stale answer for an older query is dropped.
  useEffect(() => {
    if (query.length < 1) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      void searchHandles(query).then((h) => {
        if (!alive) return;
        setHits(h);
        setActive(0);
      });
    }, 180);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const open = Boolean(at && at.query.length > 0 && hits.length > 0);

  function track(next: string, caret: number) {
    onChange(next);
    const m = mentionAt(next, caret);
    setAt(m);
    if (!m || m.query.length === 0) setHits([]);
  }

  function pick(handle: string) {
    const el = ref.current;
    if (!at) return;
    const caret = el?.selectionStart ?? value.length;
    const insert = `@${handle} `;
    const next = value.slice(0, at.start) + insert + value.slice(caret);
    onChange(next);
    setAt(null);
    setHits([]);
    const pos = at.start + insert.length;
    window.setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  }

  function keyDown(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => (i + (e.key === "ArrowDown" ? 1 : hits.length - 1)) % hits.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(hits[active]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setAt(null);
        setHits([]);
        return;
      }
    }
    onKeyDown?.(e);
  }

  const common = {
    value,
    placeholder,
    maxLength,
    className,
    onKeyDown: keyDown,
    onBlur: () => window.setTimeout(() => setHits([]), 150),
    role: "combobox" as const,
    "aria-autocomplete": "list" as const,
    "aria-expanded": open,
    "aria-controls": open ? listId : undefined,
    "aria-activedescendant": open ? `${listId}-${active}` : undefined,
  };

  return (
    <div className="relative min-w-0 flex-1">
      {props.as === "textarea" ? (
        <textarea
          {...common}
          ref={ref as RefObject<HTMLTextAreaElement>}
          rows={props.rows}
          onChange={(e) => track(e.target.value, e.target.selectionStart ?? e.target.value.length)}
        />
      ) : (
        <input
          {...common}
          ref={ref as RefObject<HTMLInputElement>}
          onChange={(e) => track(e.target.value, e.target.selectionStart ?? e.target.value.length)}
        />
      )}
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("community.mentionSuggestions")}
          className="absolute left-0 top-full z-30 mt-1 w-full max-w-[280px] overflow-hidden rounded-xl border border-paper/15 bg-night-soft py-1 shadow-2xl"
        >
          {hits.map((h, i) => (
            <li
              key={h}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the box would lose focus first and close.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(h);
              }}
              className={cn(
                "cursor-pointer px-4 py-2.5 font-sans text-detail",
                i === active ? "bg-paper/[0.09] text-paper" : "text-paper/80",
              )}
            >
              @{h}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
