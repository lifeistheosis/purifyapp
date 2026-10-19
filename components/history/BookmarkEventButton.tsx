"use client";

// Save an event to Saved: local-first, no account needed, the same store
// the Bible and the writings use, so it is on /saved at once and offline.
// Hydration-gated: the neutral look paints first and the saved one follows
// on mount, because the state lives in localStorage.
//
// A round 44px button (1.7), the app's drawn bookmark, filled once saved,
// beside Share under the event's title, as a saint's page has it. It was a
// plus or a check mark set as a character, with English words.

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Bookmark } from "@/components/ui/icons/Bookmark";
import { useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";
import type { HistoryEventMeta } from "@/lib/history/events";

export function BookmarkEventButton({ event }: { event: HistoryEventMeta }) {
  const { t } = useTranslate();
  const { toggle, isBookmarked } = useBookmarks();
  const [mounted, setMounted] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate (Sheet.tsx precedent): bookmark state lives in localStorage. */
  useEffect(() => setMounted(true), []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saved = mounted && isBookmarked({ kind: "history-event", eventSlug: event.slug });
  const name = event.shortTitle ?? event.title;

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? t("saints.saveRemoveAria", { name }) : t("saints.saveAria", { name })}
      onClick={() =>
        toggle({
          kind: "history-event",
          eventSlug: event.slug,
          displayDate: event.displayDate,
          label: event.title,
        })
      }
      className={cn(
        "tap-press inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-pill border motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
        saved ? "border-paper/50 text-paper" : "border-paper/15 text-paper/75 hover:border-paper/35 hover:text-paper",
      )}
    >
      <Bookmark size={19} filled={saved} />
    </button>
  );
}
