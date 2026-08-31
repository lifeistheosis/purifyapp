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

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { setOverlayOpen } from "@/lib/ui/overlay";
import { useTranslate } from "@/components/i18n/MessagesProvider";
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
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      setOverlayOpen(false);
    };
  }, [open]);

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
      className="fixed inset-0 z-[120] flex items-start justify-center px-4 pt-[8vh] md:pt-[12vh]"
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
      <div className="relative w-full max-w-[560px] overflow-hidden rounded-card border border-gold/25 bg-night shadow-2xl">
        <div className="flex items-center gap-3 border-b border-paper/10 px-4">
          <span aria-hidden className="text-paper/30 text-ui">
            ⌕
          </span>
          <input
            ref={inputRef}
            value={query}
            onKeyDown={onKeyDown}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder={t("search.placeholder")}
            aria-label={t("search.ariaLabel")}
            className="w-full bg-transparent py-4 font-sans text-body text-paper placeholder:text-paper/35 focus:outline-none"
          />
          {/* There is no escape key on a phone, so the hint is desktop only.
              Touch dismisses by tapping the backdrop or the hardware back. */}
          <kbd className="hidden md:inline-block shrink-0 rounded-md border border-paper/15 px-1.5 py-0.5 font-sans text-caption text-paper/35">
            {t("search.escKey")}
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
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
                        "flex w-full items-baseline gap-3 px-4 py-2 text-left transition-colors",
                        isActive ? "bg-paper/8" : "hover:bg-paper/5",
                      )}
                    >
                      <span
                        className={cn(
                          "font-sans text-detail",
                          isActive ? "text-paper" : "text-paper/85",
                        )}
                      >
                        {item.label}
                      </span>
                      {item.sublabel && (
                        <span className="truncate font-sans text-caption text-paper/35">
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
