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

const NIGHT = "#101013";

export function NativeBridge() {
  useEffect(() => {
    if (!isNativeClient()) return;

    // Mark the document as the native app shell. CSS scopes app-only
    // spacing (bottom tab-bar clearance via .safe-pb, top status-bar inset
    // via .safe-pt) to html.is-native, so the website never gets app
    // padding and the app never ships web chrome. Pairs with the
    // WebOnly/NativeOnly React gates (components/platform/PlatformGate).
    document.documentElement.classList.add("is-native");

    let cancelled = false;

    const hideSplash = async () => {
      if (cancelled) return;
      try {
        const { SplashScreen } = await import("@capacitor/splash-screen");
        if (!cancelled) await SplashScreen.hide();
      } catch {
        /* fallback timeout covers it */
      }
    };

    // No-flash guarantee: keep the launch splash up until the native shell
    // has actually painted. The SSR HTML is the WEB shell (we default to
    // web so the site stays static for SEO), and React swaps to the app
    // shell right after hydration via useIsNative(). Two animation frames
    // ensure that swap is committed and painted before we lift the splash,
    // so the marketing site is never visible inside the app. A bounded
    // fallback makes sure the splash can never hang (capacitor
    // launchAutoHide is off, so this is the only hide path).
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        void hideSplash();
      }),
    );
    const fallback = setTimeout(() => void hideSplash(), 4000);

    // Pin the status bar to the night palette so the system chrome reads as
    // part of the app (Android; throws on iOS, where the WKWebView
    // background already matches).
    (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        if (cancelled) return;
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: NIGHT }).catch(() => {});
        // Lay the WebView BELOW the status bar (Android). Without this the
        // system insets the content edge-to-edge and `env(safe-area-inset-top)`
        // reads 0 on Android, so top-of-screen UI (home hero, the Bible search
        // sheet's Cancel button) renders under the clock/battery and is
        // unreachable. iOS throws here (the notch is handled by safe-area
        // insets in CSS), so the failure is swallowed.
        await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      } catch {
        /* status bar styling is cosmetic; never block the app on it */
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(fallback);
    };
  }, []);

  return null;
}
