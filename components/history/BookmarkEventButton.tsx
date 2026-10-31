"use client";

// Save an event to Saved: local-first, no account needed, the same store
// the Bible and the writings use, so it is on /saved at once and offline.
//
// One of the two buttons at the right of the event page's bar, with Share,
// beside the bar's search (1.8, the owner's note 67 of build 80: Share and
// Save were "just floating there", a row of their own under the summary).
// The bar's own 44px box and ink; saved, the app's drawn bookmark is filled
// and lit white with a soft white glow, the plain ink on Parchment
// (globals.css, History, .history-saved-lit).
//
// It knows its state in the first frame. useBookmarks reads the device in the
// page's first render (useSyncExternalStore), and only the web's first page,
// hydrated from the server's, is drawn unsaved a moment first. A mount gate
// here drew every page unsaved and filled the mark a moment after.

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Bookmark } from "@/components/ui/icons/Bookmark";
import { useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";
import type { HistoryEventMeta } from "@/lib/history/events";

export function BookmarkEventButton({
  event,
}: {
  event: Pick<HistoryEventMeta, "slug" | "title" | "shortTitle" | "displayDate">;
}) {
  const { t } = useTranslate();
  const { toggle, isBookmarked } = useBookmarks();
  const saved = isBookmarked({ kind: "history-event", eventSlug: event.slug });
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
        "tap-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
        saved ? "text-paper" : "text-paper/70 hover:text-paper",
      )}
    >
      <Bookmark size={19} filled={saved} className={saved ? "history-saved-lit" : undefined} />
    </button>
  );
}
