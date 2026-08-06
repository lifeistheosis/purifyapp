/// <reference types="@capacitor-community/safe-area" />
import type { CapacitorConfig } from "@capacitor/cli";

// Native shell configuration. The web app detects the shell via the appended
// user-agent token (see lib/platform/native.ts) and adapts: store-noncompliant
// surfaces (external donation links, PWA install prompts) are hidden, and
// native plugins (splash, status bar, haptics, share) take over their web
// equivalents.
//
// BOTH stores ship local-first (CAP_LOCAL=1). Android runs at https://localhost
// and iOS at capacitor://localhost, and each bundles the static export plus the
// content package, so the app opens and navigates with no network. Never ship a
// remote-wrapper build to the App Store: a Capacitor shell whose only content is
// a remote website is the textbook guideline 4.2 rejection.
//
// Build target. CAP_LOCAL=1 is what both release workflows set, and it is the
// only shape that ships to a store: webDir points at the static export in out/.
//
// With CAP_LOCAL unset the shell falls back to loading purifyapp.net remotely
// and webDir is unused (capacitor-shell/ holds only a minimal offline fallback
// page). That path survives for quick smoke builds of the shell itself. It is
// not shippable: Play tolerates it, the App Store rejects it under 4.2.
const LOCAL = process.env.CAP_LOCAL === "1";

const config: CapacitorConfig = {
  appId: "net.purifyapp.purify",
  appName: "Purify",
  webDir: LOCAL ? "out" : "capacitor-shell",
  ...(LOCAL
    ? { server: { androidScheme: "https" } }
    : {
        server: {
          url: "https://purifyapp.net",
          allowNavigation: ["purifyapp.net", "*.purifyapp.net", "*.supabase.co"],
        },
      }),
  ios: {
    appendUserAgent: "PurifyNative",
    backgroundColor: "#101013",
    // NO limitsNavigationsToAppBoundDomains. It was set for service workers in
    // WKWebView, but the native shell has no service worker to protect:
    // components/pwa/InstallPrompt.tsx unregisters every registration and wipes
    // every cache inside the shell precisely so a stale bundle cannot survive
    // an app update. What the flag DID do was block top-level navigation to
    // accounts.google.com, which is the web OAuth fallback, and cap the app at
    // ten app-bound domains forever. Removed together with the WKAppBoundDomains
    // array in Info.plist; setting one without the other is worse than either.
    // iOS runs local-first on the default capacitor:// scheme, which lib/api/cors.ts
    // already allow-lists as capacitor://localhost.
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
