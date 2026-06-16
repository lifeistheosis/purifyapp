"use client";

// Native (Capacitor) billing wrapper around the RevenueCat SDK.
//
// RevenueCat fronts Google Play Billing now and StoreKit when iOS unparks,
// so the app talks to one API and the server hears about purchases through
// one webhook (app/api/billing/revenuecat). Purify only cares about a
// single entitlement, `plus`; everything here resolves to "is Plus active".
//
// SSR / web safety: every function dynamic-imports the plugin and bails
// unless we are inside the native shell. The website ships the same bundle
// but must never call into the native plugin (it would reject), so callers
// gate on isNativeClient() and these functions double-check.

import { isNativeClient } from "@/lib/platform/native";
import type {
  CustomerInfo,
  PurchasesPackage,
} from "@revenuecat/purchases-typescript-internal-esm";

/** The single RevenueCat entitlement that maps to Purify Plus. Must match
 * the entitlement identifier configured in the RevenueCat dashboard. */
export const PLUS_ENTITLEMENT_ID = "plus";

// The public Android SDK key (goog_…) from the RevenueCat dashboard,
// inlined into the client bundle. Android-only at launch; an iOS key gets
// added here when iOS unparks.
const ANDROID_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";

let configured = false;

/** True only inside the native shell with a key present. Web always false,
 * so the paywall hides itself rather than showing dead buttons. */
export function billingAvailable(): boolean {
  return isNativeClient() && ANDROID_API_KEY.length > 0;
}

/**
 * Configure RevenueCat once and bind it to the Supabase account, so the
 * webhook's `app_user_id` is the Supabase uid. Idempotent: safe to call on
 * every paywall mount. Returns false when billing is unavailable.
 */
export async function initBilling(supabaseUserId: string): Promise<boolean> {
  if (!billingAvailable()) return false;
  const { Purchases, LOG_LEVEL } = await import(
    "@revenuecat/purchases-capacitor"
  );
  if (!configured) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
    await Purchases.configure({
      apiKey: ANDROID_API_KEY,
      appUserID: supabaseUserId,
    });
    configured = true;
  } else {
    // Already configured (e.g. a different account signed in): re-identify.
    await Purchases.logIn({ appUserID: supabaseUserId });
  }
  return true;
}

/** Detach the current account from RevenueCat on sign-out. */
export async function logoutBilling(): Promise<void> {
  if (!billingAvailable() || !configured) return;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  await Purchases.logOut();
}

function plusActive(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[PLUS_ENTITLEMENT_ID]);
}

/** Current Plus status straight from RevenueCat (the store's truth). */
export async function isPlusActive(): Promise<boolean> {
  if (!billingAvailable()) return false;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const { customerInfo } = await Purchases.getCustomerInfo();
  return plusActive(customerInfo);
}

export type PlusPackages = {
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
};

/** The Monthly + Yearly packages from the current RevenueCat offering. */
export async function getPlusPackages(): Promise<PlusPackages> {
  if (!billingAvailable()) return { monthly: null, yearly: null };
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  return {
    monthly: current?.monthly ?? null,
    yearly: current?.annual ?? null,
  };
}

export type PurchaseOutcome = "active" | "cancelled" | "error";

/** Buy a package. Resolves to 'active' when Plus is now on, 'cancelled'
 * when the user backed out, 'error' otherwise. Never throws. */
export async function purchase(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  if (!billingAvailable()) return "error";
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return plusActive(customerInfo) ? "active" : "error";
  } catch (e) {
    if (
      e &&
      typeof e === "object" &&
      ("userCancelled" in e
        ? (e as { userCancelled?: boolean }).userCancelled
        : /cancel/i.test((e as { code?: string }).code ?? ""))
    ) {
      return "cancelled";
    }
    return "error";
  }
}

/** Restore an existing subscription (new device / reinstall). */
export async function restore(): Promise<boolean> {
  if (!billingAvailable()) return false;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.restorePurchases();
    return plusActive(customerInfo);
  } catch {
    return false;
  }
}

/** Deep link to the Play Store subscriptions center for Purify. */
export const MANAGE_SUBSCRIPTION_URL =
  "https://play.google.com/store/account/subscriptions?package=net.purifyapp.purify";
