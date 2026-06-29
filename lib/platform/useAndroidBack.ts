"use client";

// Make the Android hardware back button dismiss a history-less overlay
// (a sheet or full-screen dialog that isn't its own browser route) instead
// of falling through to WebView history — which, with nothing to go back to,
// feels like the screen is stuck or quietly exits the app.
//
// Only active inside the native shell and only while `active` is true. The
// @capacitor/app import is dynamic so the plugin never enters the web bundle
// (same guard pattern as NativeBridge / lib/auth/nativeGoogle).
//
// Note: this is for overlays with no browser history of their own. Things that
// are real routes (e.g. the /pricing paywall) should NOT use this — there the
// default back behaviour (navigate to the previous page) is correct.

import { useEffect } from "react";

import { isNativeClient } from "@/lib/platform/native";

export function useAndroidBack(active: boolean, onBack: () => void): void {
  useEffect(() => {
    if (!active || !isNativeClient()) return;
    let remove: (() => void) | undefined;
    void (async () => {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("backButton", () => onBack());
      remove = () => void handle.remove();
    })();
    return () => remove?.();
  }, [active, onBack]);
}
