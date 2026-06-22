"use client";

// RevenueCat Web Billing (Stripe-backed) for desktop/web purchases.
//
// Separate from lib/billing/revenuecat (Capacitor / Play Billing): the web
// SDK (@revenuecat/purchases-js) runs only in the browser and only on the
// website — the native app keeps using Play Billing. Both reuse the SAME
// `plus` entitlement and the SAME webhook, so entitlements stay one source
// of truth across web and native.
//
// Requires RevenueCat Web Billing enabled in the dashboard, web products
// attached to the `plus` entitlement, and the web public key in
// NEXT_PUBLIC_REVENUECAT_WEB_KEY. Until that exists this no-ops.

import { isNativeClient } from "@/lib/platform/native";
import { PLUS_ENTITLEMENT_ID } from "./revenuecat";
import type { Package } from "@revenuecat/purchases-js";

const WEB_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_WEB_KEY ?? "";

/** True only on the website (never the native app) with a web key present. */
export function webBillingAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    !isNativeClient() &&
    WEB_API_KEY.length > 0
  );
}

let configured = false;
async function instance(uid: string) {
  const { Purchases } = await import("@revenuecat/purchases-js");
  if (!configured) {
    // Bind the purchase to the Supabase account so the webhook resolves the
    // entitlement row by uid, exactly like native.
    Purchases.configure({ apiKey: WEB_API_KEY, appUserId: uid });
    configured = true;
  }
  return Purchases.getSharedInstance();
}

export type WebPlusPackages = { monthly: Package | null; yearly: Package | null };

/** Monthly + Yearly packages from the current web offering. */
export async function getWebPlusPackages(uid: string): Promise<WebPlusPackages> {
  if (!webBillingAvailable()) return { monthly: null, yearly: null };
  try {
    const current = (await (await instance(uid)).getOfferings()).current;
    return { monthly: current?.monthly ?? null, yearly: current?.annual ?? null };
  } catch {
    return { monthly: null, yearly: null };
  }
}

export type WebPurchaseOutcome = "active" | "cancelled" | "error";

/** Open RevenueCat's Stripe-backed web checkout for a package. Never throws. */
export async function purchaseWeb(
  uid: string,
  pkg: Package,
): Promise<WebPurchaseOutcome> {
  if (!webBillingAvailable()) return "error";
  try {
    const p = await instance(uid);
    await p.purchase({ rcPackage: pkg });
    return (await p.isEntitledTo(PLUS_ENTITLEMENT_ID)) ? "active" : "error";
  } catch (e) {
    const msg = String(
      (e as { message?: string; errorCode?: string })?.message ??
        (e as { errorCode?: string })?.errorCode ??
        "",
    );
    return /cancel/i.test(msg) ? "cancelled" : "error";
  }
}

/** Current Plus status from RevenueCat (the store's truth) for this account. */
export async function isWebPlusActive(uid: string): Promise<boolean> {
  if (!webBillingAvailable()) return false;
  try {
    return await (await instance(uid)).isEntitledTo(PLUS_ENTITLEMENT_ID);
  } catch {
    return false;
  }
}
