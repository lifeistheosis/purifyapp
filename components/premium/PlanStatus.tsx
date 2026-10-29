"use client";

// Current-plan recognition for the /premium surface (and, until the owner's
// second round of 1.8 redrew /pricing as R2, for /pricing too: what a reader
// holds is now read there by components/billing/WebPaywall.tsx). Reads the
// signed-in user's REAL entitlement tier (getClientPremiumTier, straight off
// the entitlements row — not the enforcement-gated getClientEntitlements, so a
// comped or paid subscriber is recognized even pre-launch). Renders nothing
// for free / signed-out users, so the marketing pages are unchanged for them.

import Link from "next/link";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { coversTier, ownedLabel } from "@/lib/premium/coverage";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PlusCheck, PREMIUM_CTA, premiumCardBg } from "@/components/premium/PremiumUI";
import { cn } from "@/lib/cn";

/** "You're on Purify Pro/Plus" bar shown at the top of the plan pages. Gold
 *  and graphite since the 2026-09-28 premium redesign (it was green), and
 *  graphite alone since 1.7.2, when the gold left every premium surface. */
export function CurrentPlanBanner() {
  const { t } = useTranslate();
  const tier = usePremiumTier();
  if (tier !== "plus" && tier !== "pro") return null;
  const name = tier === "pro" ? "Purify Pro" : "Purify Plus";
  return (
    <div className="px-5 md:px-8 pt-6">
      <div
        className="dark-island mx-auto flex max-w-[760px] flex-wrap items-center justify-between gap-3 rounded-[20px] px-5 py-3.5 ring-1 ring-inset ring-paper/[0.12]"
        style={premiumCardBg("soft")}
      >
        <span className="flex items-center gap-2.5 font-sans text-ui font-semibold text-paper">
          <PlusCheck />
          {t("ui.youReOn")} <span className="text-paper">{name}</span>
        </span>
        <Link
          href="/account"
          className="inline-flex min-h-11 items-center rounded-pill border border-paper/25 px-4 font-sans text-caption font-semibold text-paper/85 transition-colors hover:bg-paper/[0.06] hover:text-paper"
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
        <PlusCheck />
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
