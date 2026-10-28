"use client";

import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Bookmark } from "@/components/ui/icons/Bookmark";
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
 * in localStorage and the server render cannot know it, so the neutral look
 * paints first and the real one follows on mount.
 *
 * A round 44px button at the end of the saint's row (1.7): the bookmark,
 * drawn filled once he is saved, named "Save {name}" or "Remove {name}" for
 * assistive technology, the word every other save in the app uses.
 *
 * In the top bar on a phone (1.8, round 3b D: the bookmark beside the way
 * back, on a round plate over the picture), `variant="bar"` draws it the size
 * and weight of the bar's other buttons; the bar gives it its plate.
 */
export function BookmarkSaintButton({
  slug,
  name,
  variant = "row",
  className,
}: {
  slug: string;
  name: string;
  variant?: "row" | "bar";
  className?: string;
}) {
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
        variant === "bar"
          ? "tap-press hit-44 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
          : "tap-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border motion-safe:transition-colors",
        variant === "bar"
          ? saved
            ? "text-paper"
            : "text-paper/80 hover:text-paper"
          : saved
            ? "border-paper/50 text-paper"
            : "border-paper/15 text-paper/75 hover:border-paper/35 hover:text-paper",
        className,
      )}
    >
      <Bookmark size={19} filled={saved} />
    </button>
  );
}
