"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useIsNative } from "@/lib/platform/native";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";

/**
 * Compact gold Premium pill for the mobile header, shared by the Today
 * bar (MobileTopTabs) and the per-screen MobileHeader.
 *
 * A non-subscriber now gets the upgrade modal rather than a navigation. That
 * matters most here: this pill sits on the Bible, Prayers, Discover and Today
 * headers, so tapping it used to take a reader out of whatever they were
 * reading. A sheet leaves the page underneath it intact.
 *
 * The href branch survives for the two cases the modal cannot serve: a reader
 * who already holds Plus or Pro, who wants their plan and not a sales pitch,
 * and any mount with no UpgradeModalProvider above it, where the old
 * per-platform destination still applies (native to /pricing for the Play
 * Billing paywall, web to the /premium showcase).
 */
export function MobilePremiumButton() {
  const { t } = useTranslate();
  const isNative = useIsNative();
  const tier = usePremiumTier();
  const upgrade = useUpgradeModal();
  const activated = tier === "plus" || tier === "pro";
  const label =
    tier === "pro"
      ? t("nav.proActivated")
      : tier === "plus"
        ? t("nav.plusActivated")
        : t("nav.premium");

  const className = cn(
    "inline-flex items-center gap-1 rounded-pill border px-2.5 py-1.5 font-sans text-caption font-semibold transition-colors duration-150",
    activated
      ? "border-emerald-400/60 bg-emerald-500/[0.14] text-emerald-200 hover:border-emerald-300 hover:bg-emerald-500/20"
      : "premium-glow border-[#d4af37]/55 bg-[#d4af37]/[0.12] text-[#f0cf7a] hover:border-[#d4af37] hover:bg-[#d4af37]/20",
  );
  const style = {
    boxShadow: activated
      ? "0 0 8px 0 rgba(16,185,129,0.30)"
      : "0 0 8px 0 rgba(212,175,55,0.32)",
  };
  const inner = (
    <>
      {activated ? <CheckMark /> : <PremiumSparkle />}
      {label}
    </>
  );

  if (!activated && upgrade.available) {
    return (
      <button
        type="button"
        onClick={() => upgrade.open("general")}
        aria-label={t("nav.premium")}
        className={className}
        style={style}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      href={activated ? "/plan" : isNative ? "/pricing" : "/premium"}
      aria-label={activated ? label : t("nav.premium")}
      className={className}
      style={style}
    >
      {inner}
    </Link>
  );
}

function CheckMark() {
  return (
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
  );
}

function PremiumSparkle() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path
        d="M12 2 L13.7 10.3 L22 12 L13.7 13.7 L12 22 L10.3 13.7 L2 12 L10.3 10.3 Z"
        fill="#f0cf7a"
      />
    </svg>
  );
}
