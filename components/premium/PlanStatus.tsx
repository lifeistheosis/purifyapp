"use client";

// Current-plan recognition for the /premium and /pricing surfaces. Reads the
// signed-in user's REAL entitlement tier (getClientPremiumTier, straight off
// the entitlements row — not the enforcement-gated getClientEntitlements, so a
// comped or paid subscriber is recognized even pre-launch). Renders nothing
// for free / signed-out users, so the marketing pages are unchanged for them.

import Link from "next/link";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { coversTier, ownedLabel } from "@/lib/premium/coverage";

/** Green "You're on Purify Pro/Plus" bar shown at the top of the plan pages. */
export function CurrentPlanBanner() {
  const tier = usePremiumTier();
  if (tier !== "plus" && tier !== "pro") return null;
  const name = tier === "pro" ? "Purify Pro" : "Purify Plus";
  return (
    <div className="px-5 md:px-8 pt-6">
      <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/[0.10] px-5 py-3.5">
        <span className="flex items-center gap-2.5 font-sans text-ui font-semibold text-emerald-200">
          <Check />
          You&rsquo;re on {name}
        </span>
        <Link
          href="/account"
          className="rounded-pill border border-emerald-400/40 px-3.5 py-1.5 font-sans text-caption font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/15"
        >
          Manage
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
  tone,
}: {
  tier: "plus" | "pro";
  href: string;
  label: string;
  tone: "plus" | "pro";
}) {
  const userTier = usePremiumTier();
  const covered = coversTier(userTier, tier);
  const base =
    "mt-6 inline-flex items-center justify-center gap-2 rounded-pill border px-6 py-3 font-sans text-ui font-semibold transition-colors";

  if (covered) {
    const activeLabel = ownedLabel(userTier, tier);
    return (
      <span
        className={`${base} border-emerald-400/50 bg-emerald-500/[0.12] text-emerald-200`}
      >
        <Check />
        {activeLabel}
      </span>
    );
  }

  const styles =
    tone === "pro"
      ? "border-[#d4af37]/55 bg-[#d4af37]/[0.14] text-[#f4d58a] hover:bg-[#d4af37]/24 hover:border-[#d4af37]"
      : "border-[#d4af37]/45 bg-[#d4af37]/[0.10] text-[#f0cf7a] hover:bg-[#d4af37]/20 hover:border-[#d4af37]";
  return (
    <Link href={href} className={`${base} ${styles}`}>
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
        <span className="inline-flex items-center gap-2 rounded-pill border border-emerald-400/50 bg-emerald-500/[0.12] px-6 py-3 font-sans text-ui font-semibold text-emerald-200">
          <Check />
          {label}
        </span>
        <Link
          href="/account"
          className="font-sans text-caption font-semibold text-paper/55 underline underline-offset-4 hover:text-paper"
        >
          Manage subscription
        </Link>
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden className="shrink-0">
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
