/// <reference types="@capacitor-community/safe-area" />
import type { CapacitorConfig } from "@capacitor/cli";

// Native shell configuration. The iOS and Android apps are thin Capacitor
// shells that load the production site; the web app detects the shell via
// the appended user-agent token (see lib/platform/native.ts) and adapts:
// store-noncompliant surfaces (external donation links, PWA install
// prompts) are hidden, and native plugins (splash, status bar, haptics,
// share) take over their web equivalents.
//
// webDir is a required field but unused at runtime because server.url
// points at production; capacitor-shell/ holds only a minimal offline
// fallback page.
const config: CapacitorConfig = {
  appId: "net.purifyapp.purify",
  appName: "Purify",
  webDir: "capacitor-shell",
  server: {
    url: "https://purifyapp.net",
    allowNavigation: ["purifyapp.net", "*.purifyapp.net", "*.supabase.co"],
  },
  ios: {
    appendUserAgent: "PurifyNative",
    backgroundColor: "#101013",
    // Required for service workers in WKWebView; pairs with the
    // WKAppBoundDomains array in Info.plist (purifyapp.net).
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    appendUserAgent: "PurifyNative",
    backgroundColor: "#101013",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      // Controlled hide: NativeBridge lifts the splash only after the
      // native shell has painted (no flash of the SSR web shell), with a
      // bounded fallback so it can never hang. Auto-hide would risk lifting
      // mid-hydration on a slow cold load and flashing the website.
      launchAutoHide: false,
      backgroundColor: "#101013",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#101013",
    },
    // Safe-area inset polyfill. On Android 16 edge-to-edge, Chromium < 140
    // reports env(safe-area-inset-*) as 0; this plugin pads the webview for
    // those builds and lets env() work natively on Chromium 140+. Defaults
    // are correct for our setup; pairs with EdgeToEdge.enable() in MainActivity.
    SafeArea: {},
    // Capacitor 8 ships a built-in SystemBars that ALSO consumes the window
    // insets, fighting @capacitor-community/safe-area and leaving
    // env(safe-area-inset-*) at 0 (the top bar slips under the status bar).
    // Disabling its inset handling lets the safe-area plugin own the insets so
    // env() reports real values. Required on Capacitor v8 per the plugin docs.
    SystemBars: {
      insetsHandling: "disable",
    },
    // Native prayer reminders (APNs on iOS, FCM on Android). The web layer
    // registers via @capacitor/push-notifications when isNativeClient();
    // delivery is server-side from /api/cron/push-deliver. Show the alert,
    // play the sound, and bump the badge when one arrives in foreground.
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
