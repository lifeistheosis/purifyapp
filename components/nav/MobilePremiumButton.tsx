"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useIsNative } from "@/lib/platform/native";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";

/**
 * The Premium pill in the phone tab bar (MobileHeader), on all five tabs and
 * always in the same place: on the right, just before search and the bell.
 *
 * The word alone, at one size. It carried a gold star before the word until
 * 1.7; the owner called the star a vibe-coded symbol (2026-10-16), and the
 * pill sat on the left on Today and on the right everywhere else. Selling,
 * it is the word in the Premium ink inside the gold hairline (.premium-pill,
 * .premium-glow). Once the reader holds Plus or Pro it is that plan's name
 * alone ("Plus", "Pro") in a quiet graphite pill that opens their plan; the
 * longer "Plus Activated" is what it says to a screen reader, and stays the
 * label of the computer's header button (PremiumNavCta).
 *
 * The pill paints 32px tall inside a 44px button, so the touch target meets
 * the 44px floor without a taller pill. Not .hit-44: that rule draws its box
 * with ::after, which is the layer .premium-glow breathes on.
 *
 * Selling, a tap opens the upgrade sheet, so a reader is never taken out of
 * what they were reading. The link stays for a reader who already holds a
 * plan (their plan, not a pitch) and for a mount with no UpgradeModalProvider
 * above it, where the per-platform destination still applies (native to
 * /pricing for the store's paywall, web to the /premium showcase).
 */
export function MobilePremiumButton() {
  const { t } = useTranslate();
  const isNative = useIsNative();
  const tier = usePremiumTier();
  const upgrade = useUpgradeModal();
  const activated = tier === "plus" || tier === "pro";
  const word = tier === "pro" ? t("nav.proPill") : tier === "plus" ? t("nav.plusPill") : t("nav.premium");
  const said = tier === "pro" ? t("nav.proActivated") : tier === "plus" ? t("nav.plusActivated") : t("nav.premium");

  const box = "group inline-flex h-11 shrink-0 items-center";
  const pill = (
    <span
      className={cn(
        "inline-flex h-8 items-center whitespace-nowrap rounded-pill px-3 font-sans text-caption font-semibold transition-[background,box-shadow,color] duration-150",
        activated
          ? "border border-paper/15 bg-paper/[0.05] text-paper/90 group-hover:border-paper/30 group-hover:bg-paper/10"
          : "premium-pill premium-glow",
      )}
      // The resting halo the glow breathes around, inline so a reader with
      // motion off still sees the pill lit.
      style={activated ? undefined : { boxShadow: "0 0 8px 0 rgba(201,162,90,0.28)" }}
    >
      {activated ? word : <span className="premium-gold-text">{word}</span>}
    </span>
  );

  if (!activated && upgrade.available) {
    return (
      <button type="button" onClick={() => upgrade.open("general")} aria-label={said} className={box}>
        {pill}
      </button>
    );
  }

  return (
    <Link href={activated ? "/plan" : isNative ? "/pricing" : "/premium"} aria-label={said} className={box}>
      {pill}
    </Link>
  );
}
