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
  const cap = (window as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (cap?.isNativePlatform?.()) return true;
  return navigator.userAgent.includes(NATIVE_UA_TOKEN);
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
