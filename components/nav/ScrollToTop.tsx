"use client";

import { useScrolled } from "@/lib/useScrolled";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Desktop-only "back to top" control. Anchored to the bottom-right corner
 * (previously vertical-middle left, which collided with the Bible reader's
 * chapter grid in the left rail). Fades in once the page has been scrolled
 * well past the fold; clicking it smooth-scrolls the window to the top.
 * Hidden on phones (the mobile tab bar owns the bottom area) via
 * `hidden md:inline-flex`.
 */
export function ScrollToTop() {
  const scrolled = useScrolled(480);
  const { t } = useTranslate();

  function toTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      type="button"
      aria-label={t("common.backToTop")}
      onClick={toTop}
      className={cnVisible(scrolled)}
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19 L12 6" />
        <path d="M6 12 L12 5 L18 12" />
      </svg>
    </button>
  );
}

function cnVisible(scrolled: boolean): string {
  const base =
    "hidden md:inline-flex fixed right-7 bottom-7 z-40 items-center justify-center h-11 w-11 rounded-full border border-paper/20 bg-night/85 backdrop-blur text-paper/70 shadow-lg transition-opacity duration-200 hover:text-paper hover:border-gold/50 focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2";
  return scrolled
    ? `${base} opacity-100 pointer-events-auto`
    : `${base} opacity-0 pointer-events-none`;
}
