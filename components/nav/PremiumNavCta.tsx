"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";

/**
 * The glowing "Premium" pill in the site header, shared by the marketing
 * Navbar and the in-app AppNav so the call-to-action is identical
 * everywhere. It replaced the old "Open Purify" CTA in both. Real gold
 * (#d4af37) with a soft breathing halo (.premium-glow) that ties it to the
 * gold /premium and /pricing surfaces.
 *
 * When the signed-in user already holds Plus or Pro the pill flips to a
 * green "Plus Activated" / "Pro Activated" state (no upsell glow, a check
 * instead of the sparkle), so their own plan reads as active rather than as
 * a thing to buy. Tier is read client-side from the entitlements row.
 */
export function PremiumNavCta({
  active = false,
  fullWidth = false,
  onClick,
}: {
  active?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
}) {
  const { t } = useTranslate();
  const tier = usePremiumTier();
  const upgrade = useUpgradeModal();
  const activated = tier === "plus" || tier === "pro";
  const label =
    tier === "pro"
      ? t("nav.proActivated")
      : tier === "plus"
        ? t("nav.plusActivated")
        : t("nav.premium");

  // One class list, two elements. A reader who is being SOLD something gets a
  // button, because it opens a dialog; a reader who already owns it gets a link
  // to their plan. Inside the marketing shell there is no UpgradeModalProvider
  // above this (app/page.tsx renders Navbar outside the (app) group), so the
  // link is kept there rather than regressing that shell to a full navigation.
  const className = cn(
        "inline-flex items-center justify-center gap-1.5 rounded-pill border font-sans text-ui font-semibold transition-colors duration-150",
        fullWidth ? "flex w-full px-5 py-3" : "px-5 py-2.5",
        activated
          ? "border-emerald-400/60 bg-emerald-500/[0.14] text-emerald-200 hover:border-emerald-300 hover:bg-emerald-500/20"
          : cn(
              "premium-glow",
              active
                ? "border-[#d4af37] bg-[#d4af37]/20 text-[#f4d58a]"
                : "border-[#d4af37]/55 bg-[#d4af37]/[0.12] text-[#f0cf7a] hover:border-[#d4af37] hover:bg-[#d4af37]/20",
            ),
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
        onClick={() => {
          onClick?.();
          upgrade.open("general");
        }}
        className={className}
        style={style}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      href={activated ? "/plan" : "/premium"}
      onClick={onClick}
      className={className}
      style={style}
    >
      {inner}
    </Link>
  );
}

// A small four-point gold star, matching the StarMark used across the
// pricing / premium surfaces so the nav CTA reads as their doorway.
function PremiumSparkle() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path
        d="M12 2 L13.7 10.3 L22 12 L13.7 13.7 L12 22 L10.3 13.7 L2 12 L10.3 10.3 Z"
        fill="#f0cf7a"
      />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg width={13} height={13} viewBox="0 0 24 24" aria-hidden className="shrink-0">
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
