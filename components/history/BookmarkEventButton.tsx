"use client";

// Anonymous, local-first bookmark for a history event, same localStorage
// store the Bible and writings use, so saved events appear on /saved and
// survive offline with no account. Hydration-gated: renders the neutral
// label until mounted so SSR and client agree.

import { useEffect, useState } from "react";

import { useBookmarks } from "@/lib/bookmarks";
import type { HistoryEventMeta } from "@/lib/history/events";
import { cn } from "@/lib/cn";

export function BookmarkEventButton({ event }: { event: HistoryEventMeta }) {
  const { toggle, isBookmarked } = useBookmarks();
  const [mounted, setMounted] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate (Sheet.tsx precedent): bookmark state lives in localStorage. */
  useEffect(() => setMounted(true), []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saved = mounted && isBookmarked({ kind: "history-event", eventSlug: event.slug });

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() =>
        toggle({
          kind: "history-event",
          eventSlug: event.slug,
          displayDate: event.displayDate,
          label: event.title,
        })
      }
      className={cn(
        "tap-press inline-flex min-h-[44px] items-center gap-2 rounded-pill border px-4 font-sans text-detail font-semibold transition-colors",
        saved
          ? "border-paper/50 bg-paper/10 text-paper"
          : "border-paper/20 text-paper/70 hover:border-paper/40",
      )}
    >
      <span aria-hidden>{saved ? "✓" : "+"}</span>
      {saved ? "Saved" : "Save event"}
    </button>
  );
}
