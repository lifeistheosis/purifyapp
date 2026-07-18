"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useIsNative } from "@/lib/platform/native";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";

/**
 * Compact gold Premium pill for the mobile header, shared by the Today
 * bar (MobileTopTabs) and the per-screen MobileHeader.
 *
 * Destination is per-platform for non-subscribers: the native app goes
 * straight to /pricing (the Play Billing paywall), the web keeps the
 * /premium showcase. When the signed-in user already holds Plus/Pro it
 * flips to a green "Plus Activated" / "Pro Activated" pill that links to
 * /premium so they can view their plan rather than a buy screen.
 */
export function MobilePremiumButton() {
  const { t } = useTranslate();
  const isNative = useIsNative();
  const tier = usePremiumTier();
  const activated = tier === "plus" || tier === "pro";
  const label =
    tier === "pro"
      ? "Pro Activated"
      : tier === "plus"
        ? "Plus Activated"
        : t("nav.premium");

  return (
    <Link
      href={activated ? "/plan" : isNative ? "/pricing" : "/premium"}
      aria-label={activated ? label : t("nav.premium")}
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border px-2.5 py-1.5 font-sans text-caption font-semibold transition-colors duration-150",
        activated
          ? "border-emerald-400/60 bg-emerald-500/[0.14] text-emerald-200 hover:border-emerald-300 hover:bg-emerald-500/20"
          : "premium-glow border-[#d4af37]/55 bg-[#d4af37]/[0.12] text-[#f0cf7a] hover:border-[#d4af37] hover:bg-[#d4af37]/20",
      )}
      style={{
        boxShadow: activated
          ? "0 0 8px 0 rgba(16,185,129,0.30)"
          : "0 0 8px 0 rgba(212,175,55,0.32)",
      }}
    >
      {activated ? (
        <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden className="shrink-0">
          <path
            d="M20 6 L9 17 L4 12"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden className="shrink-0">
          <path
            d="M12 2 L13.7 10.3 L22 12 L13.7 13.7 L12 22 L10.3 13.7 L2 12 L10.3 10.3 Z"
            fill="#f0cf7a"
          />
        </svg>
      )}
      {label}
    </Link>
  );
}
