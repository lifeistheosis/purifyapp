"use client";

import { useCallback, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";

import {
  DEFAULT_HIGHLIGHT_COLOR,
  HIGHLIGHT_COLORS,
  colorById,
  colorNameKey,
  isHighlightColor,
  normalizeNames,
  sameNames,
  withName,
  type HighlightNames,
} from "./highlightPalette";

export {
  DEFAULT_HIGHLIGHT_COLOR,
  HIGHLIGHT_COLORS,
  colorById,
  colorNameKey,
  highlightVars,
  isHighlightColor,
  type HighlightColor,
  type HighlightNames,
} from "./highlightPalette";

/**
 * The highlight colours on the device: what each one means to the reader, and
 * the colour they reached for last. The palette itself is
 * ./highlightPalette.ts, pure, where the tests read it.
 *
 * Names (1.7.1). A reader can say what each colour means ("Promises", "To
 * pray over", "Questions") from the names sheet, which the picker and Saved
 * both open (components/bible/HighlightNamesSheet.tsx). Names start empty:
 * until a colour is given one, it goes by what it is called ("Rose"). They
 * were five fixed meanings until 1.7.1 (Key verse, Promise, Teaching, Prayer,
 * Prophecy), which a reader saw on every highlight whether or not they meant
 * them; a name a reader wrote then is kept, under the same key, and shows.
 *
 * Kept in localStorage under the key 1.7 used, `purify:bible:highlight-legend`
 * ({ [colour id]: name }), with when they last changed beside it, so the copy
 * on the reader's account (lib/sync/highlightNames.ts) can tell which is
 * newer. Read through useSyncExternalStore, so every mounted picker, row and
 * chip changes in the same paint.
 */

const NAMES_KEY = "purify:bible:highlight-legend";
const NAMES_AT_KEY = "purify:bible:highlight-legend-at";
const LAST_KEY = "purify:bible:highlight-last";

/** Dispatched when the names change, with `detail.source` "sync" when the sync wrote them. */
export const NAMES_EVENT = "purify:highlight-legend";

const EMPTY: HighlightNames = {};

// One parsed object per stored string, so the store hands React the same
// reference until the names really change (otherwise it loops).
let namesCache: { raw: string | null; val: HighlightNames } | null = null;

function readNames(): HighlightNames {
  if (typeof window === "undefined") return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(NAMES_KEY);
  } catch {
    return EMPTY;
  }
  if (namesCache && namesCache.raw === raw) return namesCache.val;
  let val: HighlightNames = EMPTY;
  if (raw) {
    try {
      val = normalizeNames(JSON.parse(raw));
    } catch {
      val = EMPTY;
    }
  }
  namesCache = { raw, val };
  return val;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(NAMES_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(NAMES_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The names on this device, and when they last changed (null: never). */
export function localHighlightNames(): { names: HighlightNames; at: string | null } {
  let at: string | null = null;
  try {
    at = window.localStorage.getItem(NAMES_AT_KEY);
  } catch {
    /* unknown */
  }
  return { names: readNames(), at };
}

/**
 * Keep these names. `at` is given only by the sync, writing the account's
 * copy with the account's date; a change made here is dated now.
 */
export function writeHighlightNames(names: HighlightNames, opts: { at?: string; source?: "sync" } = {}): void {
  try {
    const clean = normalizeNames(names);
    if (Object.keys(clean).length > 0) window.localStorage.setItem(NAMES_KEY, JSON.stringify(clean));
    else window.localStorage.removeItem(NAMES_KEY);
    window.localStorage.setItem(NAMES_AT_KEY, opts.at ?? new Date().toISOString());
    namesCache = null;
    window.dispatchEvent(new CustomEvent(NAMES_EVENT, { detail: { source: opts.source } }));
  } catch {
    /* storage may be unavailable */
  }
}

/**
 * What a colour is called for the reader now, without a hook: the reader's
 * name for it, else its own name. For a menu built as it opens (a verse's or
 * a paragraph's right-click), so the hundreds of verses on a page do not
 * each hold a subscription for a menu most of them never open.
 */
export function highlightLabelNow(id: string, t: (key: string) => string): string {
  return readNames()[colorById(id).id] || t(colorNameKey(id));
}

/** The colour the reader chose last, for a highlight made in one tap. */
export function lastHighlightColor(): string {
  try {
    const v = window.localStorage.getItem(LAST_KEY);
    return isHighlightColor(v) ? v : DEFAULT_HIGHLIGHT_COLOR;
  } catch {
    return DEFAULT_HIGHLIGHT_COLOR;
  }
}

export function rememberHighlightColor(id: string): void {
  if (!isHighlightColor(id)) return;
  try {
    window.localStorage.setItem(LAST_KEY, id);
  } catch {
    /* kept for this visit only */
  }
}

/**
 * What each colour means, for a component.
 *
 *   nameOf(id)   the reader's name for it, or "" when it has none
 *   colorName(id) what it is called, in the reader's language ("Rose")
 *   labelOf(id)  the name when there is one, else what it is called
 *   setName      give, change or (with "") take away one colour's name
 */
export function useHighlightNames() {
  const { t } = useTranslate();
  const names = useSyncExternalStore(subscribe, readNames, () => EMPTY);

  const colorName = useCallback((id?: string | null) => t(colorNameKey(id)), [t]);
  const nameOf = useCallback((id?: string | null) => names[colorById(id).id] ?? "", [names]);
  const labelOf = useCallback((id?: string | null) => nameOf(id) || colorName(id), [nameOf, colorName]);

  const setName = useCallback((id: string, name: string) => {
    const before = readNames();
    const next = withName(before, id, name);
    if (!sameNames(before, next)) writeHighlightNames(next);
  }, []);

  return { colors: HIGHLIGHT_COLORS, names, nameOf, colorName, labelOf, setName };
}
