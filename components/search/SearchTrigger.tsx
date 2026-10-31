"use client";

// The magnifier: the door to the one search from the bar.
//
// The search screen is mounted once in the root frame and renders nothing
// until it is opened, so a trigger cannot reach it through props or context.
// It asks by the one event instead (lib/search/open.ts). The magnifier names
// no place, so the screen opens turned to the place the reader is in (the
// owner's pick of r3-12, "C, with the mix of B"): on Theology, Theology; on
// Today, Everything.

import { Search } from "@/components/ui/icons/Search";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { haptic } from "@/lib/ui/motion";
import { cn } from "@/lib/cn";
import { openSearch } from "@/lib/search/open";

// Kept here too for the callers that import it from the magnifier.
export { openSearch };

export function SearchTrigger({
  className,
  iconSize = 20,
}: {
  className?: string;
  /** 22 in the phone tab bar, where it is drawn the size of the bell beside it. */
  iconSize?: number;
}) {
  const { t } = useTranslate();
  return (
    <button
      type="button"
      onClick={() => {
        haptic("light");
        openSearch();
      }}
      aria-label={t("search.open")}
      title={t("search.open")}
      // 44px, the platform's touch target, in the phone tab bar (MobileHeader)
      // and in the 48px bar of the inner pages (MobileTopBar) alike.
      className={cn(
        "h-11 w-11 inline-flex shrink-0 items-center justify-center rounded-pill text-paper/70 transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2",
        className,
      )}
    >
      <Search size={iconSize} aria-hidden />
    </button>
  );
}
