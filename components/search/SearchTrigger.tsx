"use client";

// The door to the command palette.
//
// The palette is mounted once in the root layout and renders nothing until it
// is opened, so a trigger cannot reach it through props or context. It asks by
// dispatching SEARCH_OPEN_EVENT on window instead, the same shape the reader
// preferences use (`purify:reader-prefs`).
//
// Desktop has Cmd+K and does not need this. It exists because a phone has no
// keyboard shortcut, and until now had no way at all to open a search that was
// already shipping in the bundle.

import { Search } from "@/components/ui/icons/Search";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { haptic } from "@/lib/ui/motion";
import { cn } from "@/lib/cn";
import { SEARCH_OPEN_EVENT } from "./CommandPalette";

export function openSearch(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SEARCH_OPEN_EVENT));
}

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
