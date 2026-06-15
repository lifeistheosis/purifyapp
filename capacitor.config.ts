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
      launchAutoHide: true,
      backgroundColor: "#101013",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#101013",
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
