"use client";

// Detection for the Capacitor native shell (iOS / Android app-store
// builds). The shell appends the "PurifyNative" token to the WebView
// user-agent (capacitor.config.ts) and injects window.Capacitor, so both
// signals are present from the first frame inside the app and absent in
// every ordinary browser.
//
// Why surfaces gate on this: the store builds must not show external
// donation links (Apple guideline 3.1.1) or PWA install prompts (the
// user is already inside the app). The web experience is unchanged.
//
// Client half. Server components use lib/platform/nativeRequest.ts,
// which reads the same UA token from the request headers.

import { useSyncExternalStore } from "react";

import { NATIVE_UA_TOKEN } from "./token";

export { NATIVE_UA_TOKEN };

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
};

/** True when running inside the Capacitor shell. Safe to call anywhere;
 * returns false during SSR. */
export function isNativeClient(): boolean {
  if (typeof window === "undefined") return false;
  // Dev-only escape hatch. The app shell (Today, the tab bar) is NativeOnly,
  // so a plain `npm run dev` browser can never see it — you had to build and
  // install the APK to look at the mobile UI. Setting
  // localStorage["purify:force-native"] = "1" simulates the shell so mobile
  // work is verifiable in a browser at a phone viewport. Compiled out of
  // production builds; the store bundles are unaffected.
  if (process.env.NODE_ENV === "development") {
    try {
      if (window.localStorage.getItem("purify:force-native") === "1") return true;
    } catch {
      // localStorage can throw in a sandboxed frame; fall through.
    }
  }
  const cap = (window as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  return navigator.userAgent.includes(NATIVE_UA_TOKEN);
}

export type NativePlatform = "ios" | "android";

/**
 * WHICH shell, for the few things that genuinely differ between the stores:
 * which RevenueCat key configures billing, which store an update prompt links
 * to, which provider a native sign-in button should offer.
 *
 * Null on the web, and null inside the shell if Capacitor has not injected
 * itself yet, so callers must treat null as "not a store build" rather than
 * "some other store".
 *
 * Deliberately NOT derived from the user-agent: both shells append the same
 * "PurifyNative" token, and they should keep doing so. The server has no reason
 * to care which phone is asking, and the routes that DO care (push device
 * registration) are handed an explicit platform field. Splitting the token
 * would put a second thing to keep in sync in front of the /api/track
 * Sec-Fetch-Site exemption and the native entitlement gate.
 */
export function nativePlatform(): NativePlatform | null {
  if (typeof window === "undefined") return null;
  const cap = (window as { Capacitor?: { getPlatform?: () => string } })
    .Capacitor;
  const p = cap?.getPlatform?.();
  return p === "ios" || p === "android" ? p : null;
}

/** True inside the iOS app specifically. */
export function isIOSClient(): boolean {
  return nativePlatform() === "ios";
}

// The value never changes within a page lifetime, so the store never
// notifies; useSyncExternalStore still gives us the correct
// server-snapshot (false) vs client-snapshot split without a
// set-state-in-effect cycle.
function subscribe(): () => void {
  return () => {};
}

/**
 * Hook form for client components. SSR and the first client render agree
 * via the server snapshot (false); the client snapshot takes over after
 * hydration, so native-only hiding applies before the user can interact.
 */
export function useIsNative(): boolean {
  return useSyncExternalStore(subscribe, isNativeClient, () => false);
}
