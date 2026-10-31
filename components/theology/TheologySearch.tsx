"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Search } from "@/components/ui/icons/Search";
import { cn } from "@/lib/cn";
import { openSearch } from "@/lib/search/open";
import { haptic } from "@/lib/ui/motion";
import { useOverlayOpen } from "@/lib/ui/overlay";

/**
 * Search the library, in reach of the thumb (1.8, round 3 r3-04, part 3, C:
 * "A search pill floats above the tab bar on every Theology screen, in reach
 * of the thumb"). The owner's note 24 of build 80: "I don't like how search
 * the library is literally all the way at the bottom."
 *
 * The pill opens the app's one search, turned to Theology (the owner's pick
 * of r3-12, "C, with the mix of B", which also answers r3-13's question:
 * "Theology's own search or the app's", the app's, opened on Theology). It
 * opened a sheet of its own until then, over a second list, so the bar's
 * magnifier and this pill gave two answers to one word on one screen. The
 * one search reads the same list (app/theology-search.json, merged into its
 * index) and shows the library's kinds as its strip: Doctrine, Topics,
 * Heresies, Apologetics, the Councils and the Fathers, each listed whole
 * with nothing typed, as the sheet's rows did (components/search/
 * CommandPalette.tsx).
 *
 * The pill stands over the tab bar, the mini player and Today's readings bar
 * by their own heights (globals.css, .theology-search-pill), and steps aside
 * while a sheet or the search is open. An empty block of its height ends the
 * page, so the last line of a page can always be scrolled clear of it.
 */
export function TheologySearch() {
  const { t } = useTranslate();
  const covered = useOverlayOpen();
  return (
    <>
      {/* Room at the foot of the page, so its last line scrolls clear of the pill. */}
      <div aria-hidden className="h-20" />
      <div
        data-theology-search=""
        aria-hidden={covered || undefined}
        className={cn(
          "theology-search-pill pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 motion-safe:transition-opacity motion-safe:duration-200",
          covered && "opacity-0",
        )}
      >
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => {
            haptic("light");
            openSearch("theology");
          }}
          tabIndex={covered ? -1 : undefined}
          className={cn(
            "theology-search-button tap-press inline-flex h-[50px] max-w-full items-center gap-2.5 rounded-pill border border-paper/20 bg-night-soft ps-[18px] pe-[22px] font-sans text-[15px] font-semibold text-paper",
            covered ? "pointer-events-none" : "pointer-events-auto",
          )}
        >
          <Search size={19} className="shrink-0" />
          <span className="truncate">{t("study.theology.searchLibrary")}</span>
        </button>
      </div>
    </>
  );
}
