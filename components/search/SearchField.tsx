"use client";

import { Search } from "@/components/ui/icons/Search";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { haptic } from "@/lib/ui/motion";
import { cn } from "@/lib/cn";
import { openSearch } from "./SearchTrigger";

/**
 * A search field that says what it finds, for the top of Discover.
 *
 * It is a button dressed as a field: a tap opens the search the app already
 * has (the same event the magnifier sends), so there is one search and not
 * two. The owner marked it on 2026-10-07 ("a search field under the title
 * that says what it finds", after Hallow's Discover) and picked the Discover
 * that carries it on 2026-10-15. The line is `search.placeholder`, written in
 * all 21 languages long before it was shown on a phone.
 */
export function SearchField({ className }: { className?: string }) {
  const { t } = useTranslate();
  return (
    <button
      type="button"
      onClick={() => {
        haptic("light");
        openSearch();
      }}
      aria-label={t("search.ariaLabel")}
      className={cn(
        "tap-press flex h-12 w-full items-center gap-2.5 rounded-[14px] border border-paper/10 bg-paper/[0.04] px-3.5 text-left text-paper/50 transition-colors hover:bg-paper/[0.07]",
        className,
      )}
    >
      <Search size={18} aria-hidden />
      <span className="min-w-0 truncate font-sans text-ui">{t("search.placeholder")}</span>
    </button>
  );
}
