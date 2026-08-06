"use client";

// Native (Capacitor) billing wrapper around the RevenueCat SDK.
//
// RevenueCat fronts Google Play Billing on Android and StoreKit on iOS, so the
// app talks to one API and the server hears about purchases through one webhook
// (app/api/billing/revenuecat). Purify only cares about a single entitlement,
// `plus`; everything here resolves to "is Plus active".
//
// SSR / web safety: every function dynamic-imports the plugin and bails
// unless we are inside the native shell. The website ships the same bundle
// but must never call into the native plugin (it would reject), so callers
// gate on isNativeClient() and these functions double-check.

import { isNativeClient, nativePlatform } from "@/lib/platform/native";
import type {
  CustomerInfo,
  PurchasesPackage,
} from "@revenuecat/purchases-typescript-internal-esm";

/** RevenueCat entitlement identifiers, matching the dashboard. `pro` is a
 * superset of `plus`: a Pro subscriber gets every Plus feature plus the Pro
 * members' layer (the monthly mailed icon and shop codes), so the Plus checks
 * below treat an active `pro` as Plus too. */
export const PLUS_ENTITLEMENT_ID = "plus";
export const PRO_ENTITLEMENT_ID = "pro";

// The public SDK keys from the RevenueCat dashboard (goog_… for Play, appl_…
// for StoreKit), inlined into the client bundle at build time. Each store's app
// is a separate RevenueCat app with its own key, and configuring the SDK with
// the wrong one fails at the store boundary rather than at configure(), so this
// must be chosen by platform and never defaulted.
const ANDROID_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";
const IOS_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? "";

/** The key for the store this build is running in. Empty on web, and empty on
 * a platform whose key was not set at build time. */
function apiKey(): string {
  switch (nativePlatform()) {
    case "ios":
      return IOS_API_KEY;
    case "android":
      return ANDROID_API_KEY;
    default:
      return "";
  }
}

let configured = false;

/** True only inside the native shell with that platform's key present. Web
 * always false, so the paywall hides itself rather than showing dead buttons.
 *
 * A platform whose key is unset degrades the same way: PlusPaywall renders its
 * "unavailable" phase. That is the correct resting state for a store where the
 * products are not live yet, and it is why shipping iOS ahead of its StoreKit
 * products does not show anyone a broken purchase button. */
export function billingAvailable(): boolean {
  return isNativeClient() && apiKey().length > 0;
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
      apiKey: apiKey(),
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

/** Pro is active: the members' tier (monthly mailed icon + shop codes). */
function proActive(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[PRO_ENTITLEMENT_ID]);
}

/** Plus is active. Pro includes Plus, so an active `pro` counts as Plus. */
function plusActive(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[PLUS_ENTITLEMENT_ID]) || proActive(info);
}

/** Current Plus status straight from RevenueCat (the store's truth). */
export async function isPlusActive(): Promise<boolean> {
  if (!billingAvailable()) return false;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const { customerInfo } = await Purchases.getCustomerInfo();
  return plusActive(customerInfo);
}

/** Current Pro status straight from RevenueCat. Plus does not imply Pro. */
export async function isProActive(): Promise<boolean> {
  if (!billingAvailable()) return false;
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const { customerInfo } = await Purchases.getCustomerInfo();
  return proActive(customerInfo);
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

/**
 * The Monthly + Yearly packages for Purify Pro. Pro lives in its OWN
 * RevenueCat offering (Plus is the default/current one), looked up by the
 * same conventional identifiers the web side uses (lib/billing/revenuecatWeb).
 * Returns nulls until the dashboard offering exists, and the paywall's Pro
 * tab degrades to "not available right now".
 */
export async function getProPackages(): Promise<PlusPackages> {
  if (!billingAvailable()) return { monthly: null, yearly: null };
  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const offerings = await Purchases.getOfferings();
  const all = offerings.all ?? {};
  const pro = all["pro"] ?? all["purify_pro"] ?? all["default_pro"] ?? null;
  return {
    monthly: pro?.monthly ?? null,
    yearly: pro?.annual ?? null,
  };
}

export type PurchaseOutcome = "active" | "cancelled" | "error";

/** Buy a package. Resolves to 'active' when the tier's entitlement is now
 * on, 'cancelled' when the user backed out, 'error' otherwise. Never throws.
 * `tier` decides which entitlement proves success: a Pro purchase must light
 * `pro`, not merely `plus`. */
export async function purchase(
  pkg: PurchasesPackage,
  tier: "plus" | "pro" = "plus",
): Promise<PurchaseOutcome> {
  if (!billingAvailable()) return "error";
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    const ok =
      tier === "pro" ? proActive(customerInfo) : plusActive(customerInfo);
    return ok ? "active" : "error";
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

/** Apple's subscription centre. Not app-specific: iOS has no per-app deep link,
 * this opens the reader's subscription list in Settings/App Store. */
export const APPLE_MANAGE_SUBSCRIPTION_URL =
  "https://apps.apple.com/account/subscriptions";

/**
 * Where "manage subscription" should send THIS reader.
 *
 * A subscription bought through StoreKit can only be cancelled through Apple,
 * and one bought through Play only through Google. Sending an iPhone subscriber
 * to the Play Store, which is what the single constant above did for everyone,
 * lands them on a page that cannot see their subscription and offers no way to
 * cancel it, which is the shape of complaint that becomes a refund and a review.
 *
 * Falls back to Play on web, matching where the only purchasable subscription
 * came from before web billing existed.
 */
export function manageSubscriptionUrl(): string {
  return nativePlatform() === "ios"
    ? APPLE_MANAGE_SUBSCRIPTION_URL
    : MANAGE_SUBSCRIPTION_URL;
}
