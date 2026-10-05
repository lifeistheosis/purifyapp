"use client";

// Cross-surface command palette. Cmd+K (Mac) / Ctrl+K (Win/Linux) opens a
// modal over any app surface; type to filter saints, prayers, Bible books,
// councils, heresies, topics, and key pages; arrows + Enter to navigate;
// Escape (or a backdrop tap) to close.
//
// It used to be desktop only, and that was the defect. The keyboard listener
// and the dialog itself were both gated to md+ pointers, while the corpus,
// app/search-corpus.json, shipped into the native bundle regardless. Every
// phone reader carried roughly 59 KB for a dialog they could not open, on the
// platform where three disconnected per-surface searches were the only way to
// find anything. The gates are gone and SearchTrigger opens it by event.
//
// The whole subtree still renders nothing until first opened, and the corpus
// is still fetched lazily on that first open, so the cost is unchanged.
//
// Visual register matches ConfirmDialog: night surface, thin gold hairline,
// display-serif group labels, sans rows.
//
// A phone gets its own layout (1.5.2). It used to get the computer's card,
// floating a tenth of the way down the screen: the field's focus ring drew a
// square box across the card's round corners, every result broke its title
// over two lines to leave room for a description beside it, the placeholder
// was cut mid-word, the keyboard covered the lower results, and the only
// ways out were a tap on the sliver of backdrop or the hardware back. Below
// md it is now the whole screen: a round field with Cancel beside it, one
// result per row with its description under it, and a list that ends where
// the keyboard begins (lib/ui/viewport.ts). A computer keeps the card.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { useIsPhoneWidth, useVisibleFrame } from "@/lib/ui/viewport";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Close } from "@/components/ui/icons/Close";
import { Search } from "@/components/ui/icons/Search";
import { GROUP_ORDER, type SearchItem, type SearchGroup } from "@/lib/search/types";

/** Dispatched on window to open the palette from anywhere. */
export const SEARCH_OPEN_EVENT = "purify:search-open";

/**
 * Catalog key per result group. The group values themselves are stable
 * English identifiers in the corpus, so the heading is looked up rather
 * than printed, and the four that already exist in the nav are reused.
 */
const GROUP_LABEL_KEYS: Record<SearchGroup, string> = {
  Bible: "nav.bible",
  Saints: "nav.saints",
  Prayers: "nav.prayers",
  "Councils & Heresies": "search.group.councilsHeresies",
  History: "search.group.history",
  Topics: "nav.topics",
  Other: "search.group.other",
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function score(item: SearchItem, q: string): number {
  // Lower is better; -1 means no match.
  const hay = normalize(
    `${item.label} ${item.sublabel ?? ""} ${item.keywords ?? ""}`,
  );
  const label = normalize(item.label);
  if (label.startsWith(q)) return 0;
  const wordStart = new RegExp(`\\b${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
  if (wordStart.test(label)) return 1;
  if (label.includes(q)) return 2;
  if (hay.includes(q)) return 3;
  return -1;
}

/**
 * The corpus, fetched once per app open and shared by every mount.
 *
 * Module scope rather than state, because it is immutable for the life of
 * the build and a second palette mount should not fetch it twice. The
 * in-flight promise is cached too, so two opens in quick succession share
 * one request.
 */
let corpusCache: SearchItem[] | null = null;
let corpusInFlight: Promise<SearchItem[]> | null = null;

function loadCorpus(): Promise<SearchItem[]> {
  if (corpusCache) return Promise.resolve(corpusCache);
  if (corpusInFlight) return corpusInFlight;
  // Relative on purpose, NOT apiFetch. This file is bundled into the export
  // and served from https://localhost inside the native shell, so a relative
  // fetch is the one that works offline. Same posture as
  // lib/content/bootstrap.ts loading the bundled content package.
  corpusInFlight = fetch("/search-corpus.json")
    .then((r) => (r.ok ? r.json() : []))
    .then((items: SearchItem[]) => {
      corpusCache = Array.isArray(items) ? items : [];
      return corpusCache;
    })
    .catch(() => {
      // A palette with nothing in it still opens, still takes a query, and
      // still says it found nothing. It never blocks the app.
      corpusCache = [];
      return corpusCache;
    })
    .finally(() => {
      corpusInFlight = null;
    });
  return corpusInFlight;
}

export function CommandPalette() {
  const router = useRouter();
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [items, setItems] = useState<SearchItem[]>(corpusCache ?? []);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const phone = useIsPhoneWidth();
  // On a phone the surface is the part of the screen the keyboard has left.
  const frame = useVisibleFrame();

  // Fetched on first open, not on mount: the palette is on every screen and
  // most readers never open it, so this costs nothing until it is wanted.
  useEffect(() => {
    if (!open || corpusCache) return;
    let alive = true;
    loadCorpus().then((c) => {
      if (alive) setItems(c);
    });
    return () => {
      alive = false;
    };
  }, [open]);

  // Opened from anywhere: components/search/SearchTrigger dispatches this.
  // A custom event rather than context, because the trigger and the palette
  // are mounted in different trees (the bar is per page, the palette once in
  // the root layout) and the palette renders null until it is opened.
  useEffect(() => {
    function onOpen() {
      setQuery("");
      setActive(0);
      setOpen(true);
    }
    window.addEventListener(SEARCH_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(SEARCH_OPEN_EVENT, onOpen);
  }, []);

  // Global Cmd/Ctrl+K toggle. No longer gated to md+ pointers: the gate was
  // the desktop half of a pair that also hid the dialog itself, which left
  // every phone reader paying for a corpus they could not open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          setQuery("");
          setActive(0);
          setOpen(true);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setOverlayOpen(true);
    // The page behind must not scroll under a finger that is on the results.
    lockBodyScroll();
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      setOverlayOpen(false);
      unlockBodyScroll();
    };
  }, [open]);

  // Android's back button closes the search, as the note on the esc hint has
  // always said it did. It was never wired: back left the screen instead.
  useAndroidBack(open, () => setOpen(false));

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) {
      // Empty query: a short, useful default set, not the whole corpus.
      return items
        .filter((i) => i.group === "Prayers" || i.group === "Other")
        .slice(0, 8);
    }
    const scored: { item: SearchItem; s: number }[] = [];
    for (const item of items) {
      const s = score(item, q);
      if (s >= 0) scored.push({ item, s });
    }
    scored.sort((a, b) => a.s - b.s || a.item.label.localeCompare(b.item.label));
    return scored.slice(0, 40).map((x) => x.item);
  }, [items, query]);

  // Group the visible results, preserving GROUP_ORDER.
  const grouped = useMemo(() => {
    const map = new Map<SearchGroup, SearchItem[]>();
    for (const item of results) {
      const arr = map.get(item.group) ?? [];
      arr.push(item);
      map.set(item.group, arr);
    }
    const flat: SearchItem[] = [];
    const sections: { group: SearchGroup; items: SearchItem[] }[] = [];
    for (const g of GROUP_ORDER) {
      const arr = map.get(g);
      if (arr && arr.length) {
        sections.push({ group: g, items: arr });
        flat.push(...arr);
      }
    }
    return { sections, flat };
  }, [results]);

  function go(item: SearchItem | undefined) {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, grouped.flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(grouped.flat[active]);
    }
  }

  // Keep the active row in view as arrows move it.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] md:flex md:items-start md:justify-center md:px-4 md:pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label={t("search.ariaLabel")}
    >
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={() => setOpen(false)}
        // Flat, no backdrop-filter. The Android WebView bleeds imagery through
        // it and drops frames, which is why MobileTabBar and ShopSubTabs are
        // flat too. It never mattered here while the dialog was desktop only.
        className="absolute inset-0 bg-night/90"
      />
      <div
        className={cn(
          "flex flex-col bg-night",
          // A phone: the whole screen, down to the keyboard.
          "max-md:absolute max-md:inset-x-0 max-md:top-0 max-md:h-full",
          // A computer: the floating card.
          "md:relative md:w-full md:max-w-[560px] md:overflow-hidden md:rounded-card md:border md:border-gold/25 md:shadow-2xl",
        )}
        style={phone && frame ? { top: frame.top, height: frame.height } : undefined}
      >
        <div
          className="flex shrink-0 items-center gap-1.5 border-b border-paper/10 px-3 max-md:pb-2.5 md:gap-3 md:px-4"
          // Below the status bar and the notch: this surface starts at the
          // very top of the screen, in the apps and on the web alike.
          style={phone ? { paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.625rem)" } : undefined}
        >
          <label className="flex min-w-0 flex-1 items-center gap-2.5 max-md:rounded-pill max-md:border max-md:border-paper/15 max-md:bg-paper/[0.05] max-md:pl-3.5 max-md:pr-1 max-md:transition-colors max-md:focus-within:border-paper/45">
            <Search size={18} className="shrink-0 text-paper/45" />
            <input
              ref={inputRef}
              value={query}
              onKeyDown={onKeyDown}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              // The long line names everything; a phone has room for two words.
              placeholder={phone ? t("search.ariaLabel") : t("search.placeholder")}
              aria-label={t("search.ariaLabel")}
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-2.5 font-sans text-body text-paper placeholder:text-paper/35 md:py-4"
              // The field's own frame says where typing goes. The app-wide
              // focus ring is a square box, which cut across the round
              // corners here; inline, because that ring is unlayered and
              // outranks every utility.
              style={{ outline: "none" }}
            />
            {query ? (
              <button
                type="button"
                aria-label={t("study.clear")}
                onClick={() => {
                  setQuery("");
                  setActive(0);
                  inputRef.current?.focus();
                }}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-paper/55 transition-colors hover:text-paper"
              >
                <Close size={16} />
              </button>
            ) : null}
          </label>
          {/* A phone has no escape key, so it gets a word to tap. */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 shrink-0 items-center rounded-pill px-2.5 font-sans text-detail font-medium text-paper/75 transition-colors hover:text-paper md:hidden"
          >
            {t("common.cancel")}
          </button>
          <kbd className="hidden shrink-0 rounded-md border border-paper/15 px-1.5 py-0.5 font-sans text-caption text-paper/35 md:inline-block">
            {t("search.escKey")}
          </kbd>
        </div>

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2 max-md:pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] md:max-h-[52vh] md:flex-none"
        >
          {grouped.flat.length === 0 ? (
            <p className="px-4 py-8 text-center font-serif italic text-detail text-paper/40">
              {t("search.nothingFound", { query: query.trim() })}
            </p>
          ) : (
            grouped.sections.map((section) => (
              <div key={section.group} className="mb-1">
                <p className="px-4 pb-1 pt-3 font-sans text-eyebrow uppercase tracking-[2px] text-paper/35">
                  {t(GROUP_LABEL_KEYS[section.group])}
                </p>
                {section.items.map((item) => {
                  const idx = grouped.flat.indexOf(item);
                  const isActive = idx === active;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-idx={idx}
                      onMouseMove={() => setActive(idx)}
                      onClick={() => go(item)}
                      className={cn(
                        "flex w-full px-4 text-left transition-colors",
                        // A phone: the name, and what it is under it, each on
                        // one line, in a row tall enough for a thumb.
                        "max-md:min-h-[52px] max-md:flex-col max-md:justify-center max-md:gap-0.5 max-md:py-2",
                        // A computer: one line, the description beside it.
                        "md:items-baseline md:gap-3 md:py-2",
                        // A phone has no pointer resting on a row, so nothing
                        // is lit until a keyboard moves through the list.
                        isActive ? "md:bg-paper/8" : "hover:bg-paper/5",
                      )}
                    >
                      <span
                        className={cn(
                          "font-sans text-detail max-md:truncate max-md:text-ui",
                          isActive ? "text-paper" : "text-paper/85",
                        )}
                      >
                        {item.label}
                      </span>
                      {item.sublabel && (
                        <span className="truncate font-sans text-caption text-paper/35 max-md:text-paper/50">
                          {item.sublabel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
