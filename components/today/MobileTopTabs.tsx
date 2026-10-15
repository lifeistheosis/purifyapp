"use client";

import Link from "next/link";
import { MobilePremiumButton } from "@/components/nav/MobilePremiumButton";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Mobile top bar for the Today shell: three things. The Premium pill at the
 * start (the mobile parallel of the desktop nav's Premium button, since the
 * native app renders no AppNav), and the search and the bell (/whats-new) at
 * the end.
 *
 * From 1.7 the bar holds no streak and no account circle. The owner marked a
 * top bar of three on 2026-10-07 and picked this Today on 2026-10-15: the
 * streak is a row with a sentence under the greeting (StreakRow), and the
 * reader's account is the You tab, the last of the five tabs since 1.6.
 */
export function MobileTopTabs() {
  const { t } = useTranslate();
  return (
    // Solid `bg-night`, not a translucent blur: the Android WebView bleeds
    // imagery through backdrop-filter and drops frames while scrolling
    // (same reason the tab bar and the gift sequence avoid it).
    <header className="sticky top-0 z-30 bg-night border-b border-paper/8">
      <div className="flex items-center justify-between gap-3 px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-2">
        <MobilePremiumButton />
        <div className="flex items-center justify-end gap-3">
          {/* Today has no MobileTopBar, so without this the front door is the
              one screen a phone reader cannot open the search from. */}
          <SearchTrigger className="text-paper/80 hover:bg-paper/[0.06]" />
          <Link
            href="/whats-new"
            aria-label={t("nav.whatsNew")}
            className="grid h-10 w-10 place-items-center rounded-full text-paper/80 hover:text-paper hover:bg-paper/[0.06] transition-colors"
          >
            <svg
              width={26}
              height={26}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10 21a2 2 0 0 0 4 0" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
