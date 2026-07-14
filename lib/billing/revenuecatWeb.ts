"use client";

// Web billing wrapper around the RevenueCat Web SDK (@revenuecat/purchases-js).
//
// The native app buys Plus through Play Billing (lib/billing/revenuecat.ts);
// the web cannot use Play Billing, so desktop and mobile-browser users buy
// through RevenueCat Web Billing (Stripe-backed, RevenueCat-hosted checkout).
// BOTH paths write the same user-keyed `entitlements.plus_until` row through
// the one webhook (app/api/billing/revenuecat), because both bind RevenueCat's
// appUserID to the Supabase uid. So a purchase on either platform unlocks Plus
// everywhere, and RevenueCat unifies the two into a single entitlement.
//
// SSR / native safety: every function dynamic-imports the SDK and bails unless
// we are on the web with a key present. The native shell never calls into this
// (it uses the Capacitor plugin instead); this returns unavailable there.

import { isNativeClient } from "@/lib/platform/native";
import type {
  CustomerInfo,
  Offering,
  Package,
} from "@revenuecat/purchases-js";

/** Must match the native side and the entitlement ids in the RevenueCat
 *  dashboard (lib/billing/revenuecat.ts). `pro` is a superset of `plus`. */
export const PLUS_ENTITLEMENT_ID = "plus";
export const PRO_ENTITLEMENT_ID = "pro";

/** RevenueCat Web Billing public API key (rcb_…), inlined into the bundle. */
const WEB_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_WEB_KEY ?? "";

/** True only on the web with a Web Billing key configured. Native and
 *  key-less builds return false so the checkout hides rather than showing
 *  dead buttons. */
export function webBillingAvailable(): boolean {
  return !isNativeClient() && WEB_API_KEY.length > 0;
}

let configuredUser: string | null = null;

/**
 * Configure the Web SDK and bind it to the Supabase account. appUserID = the
 * Supabase uid is the unification link: the shared webhook keys on it, so a
 * web purchase writes the same entitlement row the mobile app reads.
 * Idempotent per user; re-identifies if a different account signs in.
 */
async function ensureConfigured(supabaseUserId: string) {
  const { Purchases, LogLevel } = await import("@revenuecat/purchases-js");
  if (!Purchases.isConfigured()) {
    Purchases.setLogLevel(LogLevel.Warn);
    Purchases.configure(WEB_API_KEY, supabaseUserId);
    configuredUser = supabaseUserId;
  } else if (configuredUser !== supabaseUserId) {
    await Purchases.getSharedInstance().changeUser(supabaseUserId);
    configuredUser = supabaseUserId;
  }
  return Purchases.getSharedInstance();
}

export type WebPlusPackages = {
  monthly: Package | null;
  yearly: Package | null;
  offering: Offering | null;
};

/** The Monthly + Yearly packages from the current RevenueCat web offering. */
export async function getWebPlusPackages(
  supabaseUserId: string,
): Promise<WebPlusPackages> {
  const empty: WebPlusPackages = { monthly: null, yearly: null, offering: null };
  if (!webBillingAvailable()) return empty;
  try {
    const purchases = await ensureConfigured(supabaseUserId);
    const offerings = await purchases.getOfferings();
    const current = offerings.current;
    return {
      monthly: current?.monthly ?? null,
      yearly: current?.annual ?? null,
      offering: current ?? null,
    };
  } catch {
    // Key present but the offering/products aren't set up yet (or a network
    // fault): fail soft to no packages so the checkout shows the Play link
    // instead of hanging on the loading skeleton.
    return empty;
  }
}

/**
 * The Monthly + Yearly packages for Purify Pro. Pro lives in its OWN RevenueCat
 * offering (Plus is the default/current one), so we look it up by a conventional
 * identifier. Configure the Pro offering in the RevenueCat dashboard as "pro"
 * (or purify_pro / default_pro) with Monthly + Annual packages backed by
 * Stripe web products and the `pro` entitlement. Until then this returns nulls
 * and the Pro checkout degrades to the Play link, same as Plus.
 */
export async function getWebProPackages(
  supabaseUserId: string,
): Promise<WebPlusPackages> {
  const empty: WebPlusPackages = { monthly: null, yearly: null, offering: null };
  if (!webBillingAvailable()) return empty;
  try {
    const purchases = await ensureConfigured(supabaseUserId);
    const offerings = await purchases.getOfferings();
    const all = offerings.all ?? {};
    const pro =
      all["pro"] ?? all["purify_pro"] ?? all["default_pro"] ?? null;
    return {
      monthly: pro?.monthly ?? null,
      yearly: pro?.annual ?? null,
      offering: pro ?? null,
    };
  } catch {
    return empty;
  }
}

/** Formatted price string for a package, straight from RevenueCat (live). */
export function packagePrice(pkg: Package | null): string | null {
  return pkg?.webBillingProduct?.currentPrice?.formattedPrice ?? null;
}

function proActive(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[PRO_ENTITLEMENT_ID]);
}

/** Plus is active. Pro includes Plus, so an active `pro` counts as Plus. */
function plusActive(info: CustomerInfo): boolean {
  return Boolean(info.entitlements.active[PLUS_ENTITLEMENT_ID]) || proActive(info);
}

export type PurchaseOutcome = "active" | "cancelled" | "error";

/**
 * Launch the RevenueCat web checkout for a package. Resolves to 'active' when
 * Plus is now on, 'cancelled' when the user closed the checkout, 'error'
 * otherwise. Never throws.
 */
export async function purchaseWebPlus(
  supabaseUserId: string,
  pkg: Package,
): Promise<PurchaseOutcome> {
  if (!webBillingAvailable()) return "error";
  try {
    const purchases = await ensureConfigured(supabaseUserId);
    const { customerInfo } = await purchases.purchase({ rcPackage: pkg });
    return plusActive(customerInfo) ? "active" : "error";
  } catch (e) {
    const { PurchasesError, ErrorCode } = await import("@revenuecat/purchases-js");
    if (e instanceof PurchasesError && e.errorCode === ErrorCode.UserCancelledError) {
      return "cancelled";
    }
    return "error";
  }
}

/** Current Plus status straight from RevenueCat (the store's truth). */
export async function isWebPlusActive(
  supabaseUserId: string,
): Promise<boolean> {
  if (!webBillingAvailable()) return false;
  try {
    const purchases = await ensureConfigured(supabaseUserId);
    // Pro includes Plus, so either entitlement means Plus is on.
    const [plus, pro] = await Promise.all([
      purchases.isEntitledTo(PLUS_ENTITLEMENT_ID),
      purchases.isEntitledTo(PRO_ENTITLEMENT_ID),
    ]);
    return plus || pro;
  } catch {
    return false;
  }
}

/** Current Pro status straight from RevenueCat. Plus does not imply Pro. */
export async function isWebProActive(
  supabaseUserId: string,
): Promise<boolean> {
  if (!webBillingAvailable()) return false;
  try {
    const purchases = await ensureConfigured(supabaseUserId);
    return await purchases.isEntitledTo(PRO_ENTITLEMENT_ID);
  } catch {
    return false;
  }
}

/** The RevenueCat-hosted management URL for cancel/manage, if available. */
export async function webManagementURL(
  supabaseUserId: string,
): Promise<string | null> {
  if (!webBillingAvailable()) return null;
  try {
    const purchases = await ensureConfigured(supabaseUserId);
    const info = await purchases.getCustomerInfo();
    return info.managementURL;
  } catch {
    return null;
  }
}
