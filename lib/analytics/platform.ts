import { NATIVE_UA_TOKEN } from "@/lib/platform/token";

/**
 * What a visit was read on: one of the apps, or the website on a phone, a
 * tablet or a computer. Read from the user agent the session row has always
 * kept (lib/analytics/source.ts says why this exists).
 *
 * ── How the apps are told from the website ──────────────────────────────
 *
 * Both store apps add "PurifyNative" to their user agent
 * (capacitor.config.ts, lib/platform/token.ts), and the rest of that string
 * still says Android or iPhone. So an app build already installed is
 * recognised, with nothing new sent.
 *
 * ── What it cannot know ─────────────────────────────────────────────────
 *
 * The Windows app loads the live site in the system's own browser engine and
 * says nothing about itself, so here it is the website on a computer
 * (desktop/src-tauri/src/lib.rs builds its window with no user agent of its
 * own). Telling it apart needs the page to say so, which is a change to what
 * is recorded. An iPad's browser calls itself a Mac, so it counts as a
 * computer too; the iPad app is recognised, because it carries the token.
 */

export type PlatformKind = "android-app" | "ios-app" | "web-phone" | "web-tablet" | "web-computer" | "unknown";

export const PLATFORM_KINDS: readonly PlatformKind[] = ["android-app", "ios-app", "web-phone", "web-tablet", "web-computer", "unknown"];

export const PLATFORM_LABEL: Record<PlatformKind, string> = {
  "android-app": "Android app",
  "ios-app": "iPhone app",
  "web-phone": "Website, phone",
  "web-tablet": "Website, tablet",
  "web-computer": "Website, computer",
  unknown: "Unknown",
};

export function isAppPlatform(kind: PlatformKind): boolean {
  return kind === "android-app" || kind === "ios-app";
}

export function classifyPlatform(userAgent: string | null | undefined): PlatformKind {
  const ua = userAgent ?? "";
  if (!ua.trim()) return "unknown";

  if (ua.includes(NATIVE_UA_TOKEN)) {
    if (/android/i.test(ua)) return "android-app";
    // The iPad app may call itself a Mac, as an iPad's browser does.
    if (/iphone|ipad|ipod|macintosh/i.test(ua)) return "ios-app";
    return "unknown";
  }

  if (/iphone|ipod/i.test(ua)) return "web-phone";
  if (/ipad/i.test(ua)) return "web-tablet";
  // An Android phone says "Mobile"; an Android tablet leaves it out.
  if (/android/i.test(ua)) return /mobile/i.test(ua) ? "web-phone" : "web-tablet";
  if (/windows phone|mobile safari|mobile\//i.test(ua)) return "web-phone";
  return "web-computer";
}
