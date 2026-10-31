"use client";

import { useRef, type FocusEventHandler, type KeyboardEventHandler, type RefObject } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Close } from "@/components/ui/icons/Close";
import { Search } from "@/components/ui/icons/Search";
import { cn } from "@/lib/cn";
import { openSearch } from "@/lib/search/open";
import { haptic } from "@/lib/ui/motion";

/**
 * The one search field (1.8, the owner's note 46 of build 80 and his pick of
 * r3-12). There were fourteen, each drawn its own way: heights from 44 to
 * 54px, four corner shapes, 14px type in ten of them (an iPhone zooms the
 * page into a field set under 16px), a clear button in four, and in every
 * one but two the keyboard's ring drawn as a sharp box inside the round
 * field, the box in his photo. Now every place uses this one:
 *
 *   - no box inside it: the field itself lights, a soft white glow round the
 *     pill, ink on Parchment (globals.css, .search-field), and a keyboard
 *     reaching it sees that light;
 *   - 16px type, so no phone zooms the page;
 *   - a clear button once something is typed;
 *   - the keyboard's own Search key (enterKeyHint), which submits;
 *   - a placeholder that fits a 360px phone in every language, each place's
 *     own short line, measured for the sheet.
 *
 * The field is a form, so the Search key submits it on every phone. Where a
 * place searches the whole library it does not type here at all: it shows
 * SearchDoor, the field at rest, and a tap opens the one search screen
 * turned to that place.
 */
export function SearchField({
  value,
  onChange,
  onSubmit,
  placeholder,
  label,
  inputRef,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  /** The keyboard's Search key, or Enter. The keyboard steps away first. */
  onSubmit?: () => void;
  /** The place's own short line. */
  placeholder: string;
  /** Its accessible name, when it should say more than the placeholder. */
  label?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  className?: string;
  id?: string;
}) {
  const { t } = useTranslate();
  const own = useRef<HTMLInputElement | null>(null);
  const ref = inputRef ?? own;
  return (
    <form
      role="search"
      // The keyboard's Search key submits a form on every phone; the words
      // stay, and the keyboard steps away so the results can be seen.
      onSubmit={(e) => {
        e.preventDefault();
        ref.current?.blur();
        onSubmit?.();
      }}
      data-search-field=""
      className={cn(
        "search-field flex h-[48px] min-w-0 items-center gap-2.5 rounded-pill ps-[15px] pe-2",
        className,
      )}
    >
      <Search size={19} className="search-glass shrink-0" />
      <input
        ref={ref}
        id={id}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        // 16px: an iPhone zooms the page into a field set any smaller.
        className="h-full min-w-0 flex-1 bg-transparent font-sans text-[16px] text-paper placeholder:text-paper/45"
      />
      {value ? (
        <button
          type="button"
          aria-label={t("study.clear")}
          onClick={() => {
            onChange("");
            ref.current?.focus();
          }}
          className="hit-44 inline-flex size-[24px] shrink-0 items-center justify-center rounded-full bg-paper/[0.17] text-paper/90 hover:bg-paper/25"
        >
          <Close size={13} strokeWidth={2.2} />
        </button>
      ) : null}
    </form>
  );
}

/**
 * The field at rest, where a place searches the whole library: a tap opens
 * the one search screen turned to that place (lib/search/open.ts), the
 * keyboard already up. Drawn as the field is, so the two never look apart.
 * Discover's field, the Bible's, the Saints', History's, the prayer book's
 * and the dictionary's are this.
 */
export function SearchDoor({
  place,
  placeholderKey,
  className,
  onOpen,
}: {
  /** The place it is in (lib/search/places.ts, PLACES); none opens on Everything. */
  place?: string;
  /**
   * The catalog line it shows, said here in the reader's language, so a
   * server component (Discover) can hold a door without freezing its words
   * in English in the apps' export.
   */
  placeholderKey: string;
  className?: string;
  /** Called first, as the search opens: a sheet the door stood in closes. */
  onOpen?: () => void;
}) {
  const { t } = useTranslate();
  const placeholder = t(placeholderKey);
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      data-search-door={place ?? "all"}
      onClick={() => {
        haptic("light");
        onOpen?.();
        openSearch(place ?? "all");
      }}
      className={cn(
        "search-field search-door tap-press flex h-[48px] w-full min-w-0 items-center gap-2.5 rounded-pill ps-[15px] pe-4 text-start",
        className,
      )}
    >
      <Search size={19} className="search-glass shrink-0" />
      <span className="min-w-0 truncate font-sans text-[16px] text-paper/45">{placeholder}</span>
    </button>
  );
}
