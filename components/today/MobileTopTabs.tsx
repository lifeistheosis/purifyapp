"use client";

import Link from "next/link";
import { MobilePremiumButton } from "@/components/nav/MobilePremiumButton";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Mobile top bar for the Today shell.
 *
 * The Today / Calendar text tabs were removed — the bottom tab bar already
 * carries navigation, and the greeting block below the bar opens the
 * surface. What remains is a quiet right cluster: the gold Premium pill (the
 * mobile parallel of the desktop nav's Premium button, since the native app
 * renders no AppNav), a bell linking to /whats-new, and a circular avatar
 * slot. No streak counter — prayer life is not scored back to the user.
 */
export function MobileTopTabs({ avatar }: { avatar: React.ReactNode }) {
  const { t } = useTranslate();
  return (
    // Solid `bg-night`, not a translucent blur: the Android WebView bleeds
    // imagery through backdrop-filter and drops frames while scrolling
    // (same reason the tab bar and the gift sequence avoid it).
    <header className="sticky top-0 z-30 bg-night border-b border-paper/8">
      <div className="flex items-center justify-end gap-3 px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-2">
        <MobilePremiumButton />
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
        <div className="ml-1">{avatar}</div>
      </div>
    </header>
  );
}
