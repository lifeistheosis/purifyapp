// Estimated subscription revenue, single source for the admin Revenue and
// Subscriptions views.
//
// This is an ESTIMATE, not a ledger. The entitlements table stores only
// expiry timestamps and a source, never a billed amount or a billing
// period (RevenueCat holds the real money and the webhook discards the
// event body). So we approximate: every active paid subscriber is assumed
// to be on the MONTHLY plan at the list price, and comped accounts
// (plus_source = 'comp') contribute nothing. Pro is a superset of Plus, so
// a Pro subscriber is counted once at the Pro price, never also as Plus.
//
// The admin UI must always label figures derived here as "estimated".

import { PLAN_PRICE_CENTS } from "./plans";

export type SubscriberCounts = {
  /** Active Plus, NOT Pro, excluding comped accounts. */
  plusOnly: number;
  /** Active Pro, excluding comped accounts. */
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
