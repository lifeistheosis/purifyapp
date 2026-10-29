// Does the tier a reader already holds cover the tier a plan card is selling?
//
// Pure so the rule can be tested without a session: /premium's
// PlanUpgradeCta (components/premium/PlanStatus.tsx). /pricing reads the same
// rule in its own words since 1.8 (components/billing/WebPaywall.tsx). Pro is
// a superset of Plus, so it covers both cards; Plus covers only the Plus card
// and must still be shown the Pro upgrade path.

import type { PremiumTier } from "@/lib/entitlements/client";

export type CardTier = "plus" | "pro";

/** Is `card` already included in what `userTier` holds? */
export function coversTier(
  userTier: PremiumTier | "loading",
  card: CardTier,
): boolean {
  if (userTier === "pro") return true;
  if (userTier === "plus") return card === "plus";
  return false; // free, or still loading
}

/**
 * Label for a card the reader already holds. Distinguishes "you bought this"
 * from "this came free with the tier above it", which is the difference a Pro
 * member should see on the Plus card.
 */
export function ownedLabel(
  userTier: PremiumTier | "loading",
  card: CardTier,
): string {
  return userTier === "pro" && card === "plus"
    ? "Included with Purify Pro"
    : "Your current plan";
}
