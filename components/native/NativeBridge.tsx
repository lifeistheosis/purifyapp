"use client";

// Native-shell glue, mounted once in the root layout. Does nothing in
// ordinary browsers; inside the Capacitor app it
//   1. hides the launch splash as soon as the web app has painted
//      (config launchAutoHide is the fallback if this never runs), and
//   2. pins the status bar to the night palette so the system chrome
//      reads as part of the app.
//
// The @capacitor/* JS proxies are safe to import in the web bundle, but
// every call is gated on isNativeClient() because their web fallbacks
// throw "not implemented" for status-bar/splash.

import { useEffect } from "react";

import { isNativeClient } from "@/lib/platform/native";

const NIGHT = "#161219";

export function NativeBridge() {
  useEffect(() => {
    if (!isNativeClient()) return;

    let cancelled = false;

    (async () => {
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        if (!cancelled) await SplashScreen.hide();
      } catch {
        /* launchAutoHide covers it */
      }
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        if (cancelled) return;
        await StatusBar.setStyle({ style: Style.Dark });
        // Android only; throws on iOS, where the WKWebView background
        // already matches.
        await StatusBar.setBackgroundColor({ color: NIGHT }).catch(() => {});
      } catch {
        /* status bar styling is cosmetic; never block the app on it */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
