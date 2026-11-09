/**
 * Revenue's "Realized" figure: what customers have paid, all time, after
 * refunds and before fees, and which parts of it could be read.
 *
 * The rule, written down after 2026-11-09, when the owner said the revenue
 * "isn't correctly set up" and three faults were found under this one card:
 *
 *  1. RevenueCat's half never arrived (its answers were read in the wrong
 *     shape, lib/billing/revenuecatMetrics.ts), so the figure was never shop
 *     plus Plus.
 *  2. Without it the card showed what Stripe had paid out to the bank: days
 *     behind the sales, a transfer rather than a sale, and blind to Plus
 *     bought on Google Play, yet it said "complete".
 *  3. A partial refund was counted as kept (lib/shop/partialRefunds.ts).
 *
 * So: the shop, plus Plus from RevenueCat when it answers. When it does not,
 * Plus bought on the website from Stripe stands in, and the figure is
 * partial and names what is missing. It is complete only when Plus came from
 * RevenueCat and the partial refunds were read.
 *
 * Pure: the parts in, the figure and its words out.
 */

export type RealizedParts = {
  /** The shop, paid less refunds (partial ones included when read). */
  shopNetCents: number;
  /** What members paid for Plus since launch, from RevenueCat; null when it cannot answer. */
  plusCents: number | null;
  /** What the website took through Stripe for anything but the shop; null unless Stripe was read. */
  webPlusCents: number | null;
  /** Whether the partial refunds could be read. */
  refundsRead: boolean;
};

export type Realized = {
  totalCents: number;
  complete: boolean;
  /** What the total does not hold, in words, for the card to say. */
  missing: string[];
  source: "revenuecat" | "stripe" | "partial";
};

export function realizedRevenue(p: RealizedParts): Realized {
  const missing: string[] = [];
  let plus = 0;
  let source: Realized["source"] = "partial";
  if (p.plusCents != null) {
    plus = p.plusCents;
    source = "revenuecat";
  } else if (p.webPlusCents != null) {
    plus = p.webPlusCents;
    source = "stripe";
    missing.push("Plus bought through Google Play and the App Store");
  } else {
    missing.push("Plus");
  }
  if (!p.refundsRead) missing.push("partial refunds (not read)");
  return {
    totalCents: p.shopNetCents + plus,
    complete: missing.length === 0,
    missing,
    source,
  };
}
