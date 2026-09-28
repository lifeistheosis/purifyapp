"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useIsNative } from "@/lib/platform/native";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { GoldCheck, GoldStar } from "@/components/premium/PremiumUI";

/**
 * Compact gold Premium pill for the mobile header, shared by the Today
 * bar (MobileTopTabs) and the per-screen MobileHeader. Drawn like the
 * header's PremiumNavCta since 2026-09-28: antique gold hairline and
 * lettering when selling, graphite with a gold check once it is theirs.
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
    "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1.5 font-sans text-caption font-semibold transition-[background,box-shadow,color] duration-150",
    activated
      ? "border border-paper/15 bg-paper/[0.05] text-paper/90 hover:border-paper/30 hover:bg-paper/10"
      : "premium-pill premium-glow",
  );
  const style = activated ? undefined : { boxShadow: "0 0 8px 0 rgba(201,162,90,0.28)" };
  const inner = activated ? (
    <>
      <GoldCheck size={12} />
      {label}
    </>
  ) : (
    <>
      <GoldStar size={12} />
      <span className="premium-gold-text">{label}</span>
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

