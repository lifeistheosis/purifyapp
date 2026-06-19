"use client";

// RevenueCat hosted UI (@revenuecat/purchases-capacitor-ui): the
// dashboard-designed Paywall and the native Customer Center.
//
// These complement the custom components/billing/PlusPaywall — they do not
// replace it. They are native-only and dynamic-imported (no-ops on web),
// gated on the same billingAvailable() as the rest of billing, and assume
// Purchases is already configured (initBilling in ./revenuecat). They also
// require the matching setup in the RevenueCat dashboard:
//   * a Paywall designed for the `plus` offering, for presentPlusPaywall*
//   * Customer Center enabled, for presentCustomerCenter
// Until that dashboard config exists the calls simply no-op / fall back.

import { billingAvailable, PLUS_ENTITLEMENT_ID } from "./revenuecat";

export type PaywallOutcome =
  | "purchased"
  | "restored"
  | "cancelled"
  | "not_presented"
  | "error";

// PAYWALL_RESULT is a string enum whose values match these member names, so
// a string compare is stable without importing the enum value (keeps this
// module from eagerly pulling the plugin into the web bundle).
function mapResult(result: unknown): PaywallOutcome {
  switch (String(result)) {
    case "PURCHASED":
      return "purchased";
    case "RESTORED":
      return "restored";
    case "CANCELLED":
      return "cancelled";
    case "NOT_PRESENTED":
      return "not_presented";
    default:
      return "error";
  }
}

/**
 * Present the dashboard-designed paywall for the current offering. Returns
 * the outcome; never throws. No-ops ('not_presented') on web or when
 * billing is unavailable.
 */
export async function presentPlusPaywall(): Promise<PaywallOutcome> {
  if (!billingAvailable()) return "not_presented";
  try {
    const { RevenueCatUI } = await import(
      "@revenuecat/purchases-capacitor-ui"
    );
    const { result } = await RevenueCatUI.presentPaywall();
    return mapResult(result);
  } catch {
    return "error";
  }
}

/**
 * Present the paywall only if the user does not already hold Plus. Ideal as
 * a gate in front of a Plus-only action.
 */
export async function presentPlusPaywallIfNeeded(): Promise<PaywallOutcome> {
  if (!billingAvailable()) return "not_presented";
  try {
    const { RevenueCatUI } = await import(
      "@revenuecat/purchases-capacitor-ui"
    );
    const { result } = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: PLUS_ENTITLEMENT_ID,
    });
    return mapResult(result);
  } catch {
    return "error";
  }
}

/**
 * Present the native Customer Center (manage / restore / cancel / request a
 * refund / contact support). Returns false if it could not be shown (web,
 * billing unavailable, or not yet enabled in the dashboard) so the caller
 * can fall back to the Play subscriptions deep link.
 */
export async function presentCustomerCenter(): Promise<boolean> {
  if (!billingAvailable()) return false;
  try {
    const { RevenueCatUI } = await import(
      "@revenuecat/purchases-capacitor-ui"
    );
    await RevenueCatUI.presentCustomerCenter();
    return true;
  } catch {
    return false;
  }
}
