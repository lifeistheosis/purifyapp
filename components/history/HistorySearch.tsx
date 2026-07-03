"use client";

// Search over Church history. One matching logic (lib/history/filter's
// searchEvents) with two presentations:
//  - inline: a search field with a results panel beneath it (mobile web
//    inline, desktop sidebar).
//  - overlay: a full-screen surface for the native shell, opened from the
//    compact header, closed by hardware Back, Escape, or the Close button.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { publishedEvents, type HistoryEventMeta } from "@/lib/history/events";
import { searchEvents } from "@/lib/history/filter";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { setOverlayOpen } from "@/lib/ui/overlay";
import { cn } from "@/lib/cn";

function ResultRow({ event, onNavigate }: { event: HistoryEventMeta; onNavigate?: () => void }) {
  return (
    <Link
      href={`/history/${event.slug}`}
      onClick={onNavigate}
      className="tap-press block rounded-md px-3 py-3 hover:bg-paper/[0.05]"
    >
      <span className="font-sans text-caption text-paper/55">{event.displayDate}</span>
      <span className="mt-0.5 block font-sans text-ui font-semibold text-paper/90">
        {event.title}
      </span>
      <span className="mt-0.5 block font-serif text-detail text-paper/55 leading-[1.5]">
        {event.preview}
      </span>
    </Link>
  );
}

export function HistorySearchInline({
  className,
  placeholder = "Search Church history…",
}: {
  className?: string;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const results = searchEvents(publishedEvents(), q, 8);
  return (
    <div className={className}>
      <label className="sr-only" htmlFor="history-search-inline">
        Search Church history
      </label>
      <input
        id="history-search-inline"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full min-h-[44px] rounded-md border border-paper/15 bg-night-soft px-4 font-sans text-ui text-paper placeholder:text-paper/55 focus:border-paper/40 focus:outline-none"
      />
      {q.trim() ? (
        <div className="mt-2 rounded-md border border-paper/12 bg-night-soft/80 p-1">
          {results.length ? (
            results.map((e) => <ResultRow key={e.slug} event={e} />)
          ) : (
            <p className="px-3 py-4 font-serif italic text-detail text-paper/60">
              Nothing in the timeline matches “{q.trim()}”.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function HistorySearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useAndroidBack(open, onClose);

  useEffect(() => {
    setOverlayOpen(open);
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(t);
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
        setOverlayOpen(false);
      };
    }
  }, [open, onClose]);

  // Each open starts with a fresh query: the parent keys this component on
  // `open`, so closing unmounts it and state resets naturally.
  if (!open) return null;
  const results = searchEvents(publishedEvents(), q, 12);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search Church history"
      className="fixed inset-0 z-50 flex flex-col bg-night safe-pt"
    >
      <div className="flex items-center gap-2 border-b border-paper/10 px-4 py-3">
        <label className="sr-only" htmlFor="history-search-overlay">
          Search Church history
        </label>
        <input
          ref={inputRef}
          id="history-search-overlay"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Church history…"
          autoComplete="off"
          className="min-h-[44px] w-full rounded-md border border-paper/15 bg-night-soft px-4 font-sans text-ui text-paper placeholder:text-paper/55 focus:border-paper/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={onClose}
          className="tap-press min-h-[44px] shrink-0 rounded-md px-3 font-sans text-ui font-semibold text-paper/70 hover:text-paper"
        >
          Close
        </button>
      </div>
      <div className={cn("flex-1 overflow-y-auto px-3 py-2 safe-pb")}>
        {q.trim() ? (
          results.length ? (
            results.map((e) => <ResultRow key={e.slug} event={e} onNavigate={onClose} />)
          ) : (
            <p className="px-3 py-6 font-serif italic text-body text-paper/60">
              Nothing in the timeline matches “{q.trim()}”.
            </p>
          )
        ) : (
          <p className="px-3 py-6 font-sans text-detail text-paper/55">
            Search by name, place, year, or era, “Nicaea”, “1054”, “Constantinople”.
          </p>
        )}
      </div>
    </div>
  );
}
