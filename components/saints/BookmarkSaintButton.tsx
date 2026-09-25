"use client";

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useBookmarks } from "@/lib/bookmarks";
import { cn } from "@/lib/cn";

/**
 * Save a saint, so they are one tap away on /saved instead of a search.
 *
 * Asked for on 2026-09-07: "I'd like to see a option so set saints as
 * favorites. This way you don't have to search each time." A reader could
 * already save a passage from a saint's writings, but never the saint.
 *
 * Same store and same shape as BookmarkEventButton: local-first, no account
 * needed, on /saved at once. Hydration-gated, because the saved state lives
 * in localStorage and the server render cannot know it, so the neutral label
 * paints first and the real one follows on mount.
 *
 * Worded "Save", the verb every other save button in the app uses and the
 * name of the page the saint will be found on.
 */
export function BookmarkSaintButton({ slug, name }: { slug: string; name: string }) {
  const { t } = useTranslate();
  const { toggle, isBookmarked } = useBookmarks();
  const [mounted, setMounted] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration
     gate (Sheet.tsx, BookmarkEventButton precedent): the state is in
     localStorage. */
  useEffect(() => setMounted(true), []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const saved = mounted && isBookmarked({ kind: "saint", saintSlug: slug });

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? t("saints.saveRemoveAria", { name }) : t("saints.saveAria", { name })}
      onClick={() => toggle({ kind: "saint", saintSlug: slug, label: name })}
      className={cn(
        "tap-press inline-flex min-h-[44px] items-center gap-2 rounded-pill border px-4 font-sans text-detail font-semibold transition-colors [transition-duration:var(--duration-fast)] motion-reduce:transition-none",
        saved
          ? "border-paper/50 bg-paper/10 text-paper"
          : "border-paper/20 text-paper/70 hover:border-paper/40 hover:text-paper",
      )}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {saved ? t("saints.saved") : t("saints.save")}
    </button>
  );
}
