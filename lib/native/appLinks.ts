/**
 * Website addresses the app answers for, and the screen each opens.
 *
 * The EIKON thank-you card's QR encodes https://purifyapp.net/gift (one
 * address for every card: they are printed in batches). With the app on the
 * phone the owner wants that scan to open the app, not the browser
 * (2026-11-06). Android hands the opened address to Capacitor's "appUrlOpen"
 * like a shortcut's, and components/native/ShortcutListener.tsx asks this file
 * which screen it means.
 *
 * Android opens the app for it without asking only once the site proves the
 * app is its own: android:autoVerify on the intent filter in
 * android/app/src/main/AndroidManifest.xml, and
 * https://purifyapp.net/.well-known/assetlinks.json naming the Play app
 * signing certificate. Until both are live, the scan opens the website, where
 * the same claim works on the same account.
 *
 * Only the paths listed here ever do anything, and each only opens a screen,
 * for the reason lib/shortcuts/shortcuts.ts gives: MainActivity is exported,
 * so another installed app can hand it any address it likes.
 */

/** The hosts the app answers for. Keep in step with the manifest's <data>. */
export const APP_LINK_HOSTS: readonly string[] = ["purifyapp.net"];

/** Path on the website -> the app's screen. Keep in step with the manifest. */
export const APP_LINK_PATHS: Readonly<Record<string, string>> = {
  "/gift": "/gift",
};

/** The app's screen for a website address it answers for, or null. */
export function appLinkTarget(url: unknown): string | null {
  if (typeof url !== "string") return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || !APP_LINK_HOSTS.includes(u.hostname)) return null;
  if (u.username || u.password || u.port) return null;
  const path = u.pathname.replace(/\/+$/, "") || "/";
  return Object.prototype.hasOwnProperty.call(APP_LINK_PATHS, path) ? APP_LINK_PATHS[path] : null;
}
