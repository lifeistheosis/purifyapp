"use client";

// Current-plan recognition for the /premium and /pricing surfaces. Reads the
// signed-in user's REAL entitlement tier (getClientPremiumTier, straight off
// the entitlements row — not the enforcement-gated getClientEntitlements, so a
// comped or paid subscriber is recognized even pre-launch). Renders nothing
// for free / signed-out users, so the marketing pages are unchanged for them.

import Link from "next/link";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { coversTier, ownedLabel } from "@/lib/premium/coverage";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { GoldCheck, PREMIUM_CTA, premiumCardBg } from "@/components/premium/PremiumUI";
import { cn } from "@/lib/cn";

/** "You're on Purify Pro/Plus" bar shown at the top of the plan pages. Gold
 *  and graphite since the 2026-09-28 premium redesign; it was green. */
export function CurrentPlanBanner() {
  const { t } = useTranslate();
  const tier = usePremiumTier();
  if (tier !== "plus" && tier !== "pro") return null;
  const name = tier === "pro" ? "Purify Pro" : "Purify Plus";
  return (
    <div className="px-5 md:px-8 pt-6">
      <div
        className="dark-island mx-auto flex max-w-[760px] flex-wrap items-center justify-between gap-3 rounded-[20px] px-5 py-3.5 ring-1 ring-inset ring-premium/30"
        style={premiumCardBg("soft")}
      >
        <span className="flex items-center gap-2.5 font-sans text-ui font-semibold text-paper">
          <GoldCheck />
          {t("ui.youReOn")} <span className="premium-gold-text">{name}</span>
        </span>
        <Link
          href="/account"
          className="inline-flex min-h-11 items-center rounded-pill border border-premium/35 px-4 font-sans text-caption font-semibold text-premium-ink transition-colors hover:bg-premium/[0.10]"
        >
          {t("ui.manageX")}
        </Link>
      </div>
    </div>
  );
}

/**
 * A tier CTA that flips to an "active" state when the signed-in user already
 * holds that tier (or Pro, which covers Plus). Server pages pass the upsell
 * target + label; the active label reads the real entitlement.
 */
export function PlanUpgradeCta({
  tier,
  href,
  label,
}: {
  tier: "plus" | "pro";
  href: string;
  label: string;
}) {
  const userTier = usePremiumTier();
  const covered = coversTier(userTier, tier);

  if (covered) {
    const activeLabel = ownedLabel(userTier, tier);
    return (
      <span className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.05] px-6 font-sans text-ui font-semibold text-paper/90">
        <GoldCheck />
        {activeLabel}
      </span>
    );
  }

  // Each plan card has one action, and it is the gold one.
  return (
    <Link href={href} className={cn(PREMIUM_CTA, "mt-6")}>
      {label}
      <ArrowRight />
    </Link>
  );
}

/**
 * Wraps a tier's purchase surface so an existing subscriber is never sold what
 * they already hold.
 *
 * The purchase component (WebSubscribeCheckout) decides "subscribed" from
 * RevenueCat Web Billing, which is dormant until web billing is configured —
 * so it falls back to "Get it in the app" for EVERYONE, including a paid or
 * comped subscriber. The entitlements row is the real answer, and it is what
 * the banner above already reads, so consult it first and only fall through to
 * the purchase UI when the tier genuinely isn't held.
 *
 * `loading` renders a skeleton rather than the buy CTA: usePremiumTier adopts
 * its cached value before paint, so this only shows on a first-ever visit, and
 * flashing "subscribe" at a subscriber is the exact thing being fixed.
 */
export function TierPurchaseOrStatus({
  tier,
  children,
}: {
  tier: "plus" | "pro";
  children: React.ReactNode;
}) {
  const { t } = useTranslate();
  const userTier = usePremiumTier();

  if (userTier === "loading") {
    return (
      <div className="mt-7 border-t border-paper/8 pt-6">
        <div className="h-12 w-full max-w-[320px] animate-pulse rounded-pill bg-paper/[0.06]" />
      </div>
    );
  }

  if (!coversTier(userTier, tier)) return <>{children}</>;
  const label = ownedLabel(userTier, tier);

  return (
    <div className="mt-7 border-t border-paper/8 pt-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex min-h-12 items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.05] px-6 font-sans text-ui font-semibold text-paper/90">
          <GoldCheck />
          {label}
        </span>
        <Link
          href="/account"
          className="font-sans text-caption font-semibold text-paper/55 underline underline-offset-4 hover:text-paper"
        >
          {t("ui.manageSubscription")}
        </Link>
      </div>
    </div>
  );
}


function ArrowRight() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
