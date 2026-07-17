"use client";

import Link from "next/link";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useIsNative } from "@/lib/platform/native";

/**
 * Compact gold Premium pill for the mobile header, shared by the Today
 * bar (MobileTopTabs) and the per-screen MobileHeader.
 *
 * The desktop AppNav carries a prominent gold Premium button, but AppNav is
 * WebOnly: the native app renders the bottom tab bar instead, which has no
 * Premium tab, so on mobile Premium was only reachable buried in the web
 * hamburger or a lone settings row. This is the mobile parallel of that
 * desktop pill, sized down to sit in the header action cluster. Shares
 * .premium-glow with the pricing surfaces so it reads as their doorway.
 *
 * Destination is per-platform: the native app goes straight to /pricing,
 * where the full-screen Plus/Pro paywall (Play Billing) renders — the owner
 * prefers that screen over the web showcase, and one hop beats two. The web
 * keeps the /premium showcase, whose CTAs lead to the web checkout.
 */
export function MobilePremiumButton() {
  const { t } = useTranslate();
  const isNative = useIsNative();
  return (
    <Link
      href={isNative ? "/pricing" : "/premium"}
      aria-label={t("nav.premium")}
      className="premium-glow inline-flex items-center gap-1 rounded-pill border border-[#d4af37]/55 bg-[#d4af37]/[0.12] px-2.5 py-1.5 font-sans text-caption font-semibold text-[#f0cf7a] transition-colors duration-150 hover:border-[#d4af37] hover:bg-[#d4af37]/20"
      style={{ boxShadow: "0 0 8px 0 rgba(212,175,55,0.32)" }}
    >
      <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden className="shrink-0">
        <path
          d="M12 2 L13.7 10.3 L22 12 L13.7 13.7 L12 22 L10.3 13.7 L2 12 L10.3 10.3 Z"
          fill="#f0cf7a"
        />
      </svg>
      {t("nav.premium")}
    </Link>
  );
}
