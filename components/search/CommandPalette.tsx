"use client";

// Cross-surface command palette. Cmd+K (Mac) / Ctrl+K (Win/Linux) opens a
// modal over any app surface; type to filter saints, prayers, Bible books,
// councils, heresies, topics, and key pages; arrows + Enter to navigate;
// Escape (or a backdrop tap) to close.
//
// Desktop-only by design: the corpus is mounted but the keyboard listener
// and trigger are gated to md+ pointers via a matchMedia check, since the
// mobile nav model is the tab bar. The whole subtree renders nothing until
// first opened, so it costs nothing on phones.
//
// Visual register matches ConfirmDialog: night surface, thin gold hairline,
// display-serif group labels, sans rows.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { setOverlayOpen } from "@/lib/ui/overlay";
import { GROUP_ORDER, type SearchItem, type SearchGroup } from "@/lib/search/types";

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

export function CommandPalette({ items }: { items: SearchItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Global Cmd/Ctrl+K toggle, desktop pointers only.
  useEffect(() => {
    const fine =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches;
    if (!fine) return;
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
      className="fixed inset-0 z-[120] hidden md:flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search Purify"
    >
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-night/70 backdrop-blur-sm"
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
            placeholder="Search saints, prayers, Scripture, councils…"
            aria-label="Search Purify"
            className="w-full bg-transparent py-4 font-sans text-body text-paper placeholder:text-paper/35 focus:outline-none"
          />
          <kbd className="shrink-0 rounded-md border border-paper/15 px-1.5 py-0.5 font-sans text-caption text-paper/35">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
          {grouped.flat.length === 0 ? (
            <p className="px-4 py-8 text-center font-serif italic text-detail text-paper/40">
              Nothing found for &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            grouped.sections.map((section) => (
              <div key={section.group} className="mb-1">
                <p className="px-4 pb-1 pt-3 font-sans text-eyebrow uppercase tracking-[2px] text-paper/35">
                  {section.group}
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
