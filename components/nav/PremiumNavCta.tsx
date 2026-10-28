"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { PlusCheck } from "@/components/premium/PremiumUI";

/**
 * The "Premium" pill in the site header, shared by the marketing Navbar and
 * the in-app AppNav so the call-to-action is identical everywhere.
 *
 * Silver since 1.8, the owner's pick of 2026-10-27 (round 6, B, "Silver", no
 * gold), as on the phone's pill (MobilePremiumButton): the word in the
 * page's ink inside a cool metal edge, with a soft sheen and a still white
 * glow (.premium-pill in globals.css; the owner, 2026-10-28, "just use a
 * glowly white"). It was antique gold from 2026-09-28, a gold
 * hairline, the word in gold and a breathing gold halo, and flat #d4af37
 * before that, which the owner reads as yellow. The gold star before the
 * word went in 1.7: the owner called it a vibe-coded symbol (2026-10-16).
 * The word says it.
 *
 * When the signed-in user already holds Plus or Pro the pill turns quiet:
 * graphite, a check, "Plus Activated" / "Pro Activated". Their own plan
 * reads as theirs rather than as a thing to buy. It was a green pill, the
 * one colour in the header that belonged to nothing else. Tier is read
 * client-side from the entitlements row.
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
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-sans text-ui font-semibold transition-[background,border-color,color] duration-150 motion-reduce:transition-none",
    fullWidth ? "flex w-full px-5 py-3" : "px-5 py-2.5",
    activated
      ? "border border-paper/15 bg-paper/[0.05] text-paper/90 hover:border-paper/30 hover:bg-paper/10 hover:text-paper"
      : cn("premium-pill", active && "ring-1 ring-paper/40"),
  );
  const inner = activated ? (
    <>
      <PlusCheck size={13} />
      {label}
    </>
  ) : (
    label
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
    >
      {inner}
    </Link>
  );
}

