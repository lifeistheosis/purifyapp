"use client";

// The mobile website: a phone or tablet reading purifyapp.net in a browser.
//
// WHY THIS EXISTS. The owner, 2026-09-29: "the mobile WEBSITE version isn't
// supposed to show a onboarding its supposed to push them to download the
// app." Both store apps are live, so on a phone or tablet the website's job is
// to hand the visitor to the right store: Google Play on Android, the App
// Store on an iPhone or iPad. Onboarding waits until they make an account.
//
// Not the mobile website: the store apps themselves (they carry the
// PurifyNative token and window.Capacitor), the Windows app, and any desktop
// browser. There the answer is null and nothing here changes.

import { useSyncExternalStore } from "react";

import { isDesktopApp } from "@/lib/desktop/bridge";
import { isNativeClient } from "./native";
import type { StoreId } from "@/lib/marketing/storeRatings";
import { NATIVE_UA_TOKEN } from "./token";

export type { StoreId };

/**
 * Which store's app to recommend for a browser, from its user agent. Pure, so
 * it is tested without a browser. `maxTouchPoints` tells an iPad in desktop
 * mode (which reports a Mac user agent) from a real Mac.
 */
export function storeForDevice(userAgent: string, maxTouchPoints = 0): StoreId | null {
  if (!userAgent || userAgent.includes(NATIVE_UA_TOKEN)) return null;
  if (/Android/i.test(userAgent)) return "googlePlay";
  if (/iPhone|iPad|iPod/.test(userAgent)) return "appStore";
  if (/Macintosh/.test(userAgent) && maxTouchPoints > 1) return "appStore";
  return null;
}

/** The store to recommend on this device, or null when this is not the
 *  mobile website. Null during server rendering. */
export function mobileStore(): StoreId | null {
  if (typeof navigator === "undefined") return null;
  if (isNativeClient() || isDesktopApp()) return null;
  return storeForDevice(navigator.userAgent || "", navigator.maxTouchPoints || 0);
}

const noSubscribe = () => () => {};

/** The same, as a hook: null on the server and in the first render, the
 *  store once hydrated, so the markup never disagrees with the server. */
export function useMobileStore(): StoreId | null {
  return useSyncExternalStore(noSubscribe, mobileStore, () => null);
}
