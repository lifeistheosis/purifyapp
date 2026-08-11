// Estimated subscription revenue, single source for the admin Revenue and
// Subscriptions views.
//
// This is an ESTIMATE, not a ledger. The entitlements table stores only
// expiry timestamps and a source, never a billed amount or a billing
// period (RevenueCat holds the real money and the webhook discards the
// event body). So we approximate: every active paid subscriber is assumed
// to be on the MONTHLY plan at the list price, and accounts nobody paid for
// contribute nothing: both comps (plus_source = 'comp') and redeemed gifts
// (plus_source = 'gift'). Pro is a superset of Plus, so a Pro subscriber is
// counted once at the Pro price, never also as Plus.
//
// The admin UI must always label figures derived here as "estimated".

import { PLAN_PRICE_CENTS } from "./plans";

export type SubscriberCounts = {
  /** Active Plus, NOT Pro, excluding comped and gifted accounts. */
  plusOnly: number;
  /** Active Pro, excluding comped and gifted accounts. */
  pro: number;
};

/** Estimated monthly recurring revenue in cents. */
export function estimatedMrrCents(counts: SubscriberCounts): number {
  return (
    counts.plusOnly * PLAN_PRICE_CENTS.plusMonthly +
    counts.pro * PLAN_PRICE_CENTS.proMonthly
  );
}

/** Estimated annual run-rate in cents (MRR x 12). */
export function estimatedArrCents(counts: SubscriberCounts): number {
  return estimatedMrrCents(counts) * 12;
}
