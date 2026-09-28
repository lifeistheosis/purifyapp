"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { GoldCheck, GoldStar } from "@/components/premium/PremiumUI";

/**
 * The "Premium" pill in the site header, shared by the marketing Navbar and
 * the in-app AppNav so the call-to-action is identical everywhere.
 *
 * Redrawn 2026-09-28 in the owner's antique gold: a gold hairline around a
 * near-black fill (.premium-pill), the word set in the metal
 * (.premium-gold-text), a gold star, and the slow breathing halo
 * (.premium-glow, still under reduced motion as a resting glow). It was flat
 * #d4af37, which the owner reads as yellow.
 *
 * When the signed-in user already holds Plus or Pro the pill turns quiet:
 * graphite, a gold check, "Plus Activated" / "Pro Activated", no halo. Their
 * own plan reads as theirs rather than as a thing to buy. It was a green
 * pill, the one colour in the header that belonged to nothing else. Tier is
 * read client-side from the entitlements row.
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
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-sans text-ui font-semibold transition-[background,box-shadow,color] duration-150",
    fullWidth ? "flex w-full px-5 py-3" : "px-5 py-2.5",
    activated
      ? "border border-paper/15 bg-paper/[0.05] text-paper/90 hover:border-paper/30 hover:bg-paper/10 hover:text-paper"
      : cn("premium-pill premium-glow", active && "ring-1 ring-premium/50"),
  );
  // The resting halo, which the glow animation breathes around. Kept inline
  // so reduced-motion readers, who get no animation, still see the pill lit.
  const style = activated ? undefined : { boxShadow: "0 0 8px 0 rgba(201,162,90,0.28)" };
  const inner = activated ? (
    <>
      <GoldCheck size={13} />
      {label}
    </>
  ) : (
    <>
      <GoldStar size={13} />
      <span className="premium-gold-text">{label}</span>
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

