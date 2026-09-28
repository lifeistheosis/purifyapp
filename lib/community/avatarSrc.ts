import { SITE_URL } from "@/lib/site";

/**
 * The address to load a profile picture from.
 *
 * ── Why this exists ─────────────────────────────────────────────────────
 *
 * A Google sign-in puts the account's Google picture in avatar_url, and
 * Google's picture host (lh3.googleusercontent.com) answers 429 Too Many
 * Requests when the request says it comes from https://localhost, which is
 * where the Android app runs. Checked 2026-09-27 against five community
 * avatars: the Android app's referrer got 429 for three of them, while the
 * iPhone app's (capacitor://localhost), the website's, the Windows app's and
 * no referrer at all got 200 for all five. So on Android most readers who
 * signed in with Google showed as a broken picture, which read as "iPhone
 * users' pictures do not load on other platforms".
 *
 * Those pictures now go through the website's own image optimizer, which
 * fetches them with no referrer, caches them and serves them from our own
 * domain. next.config.ts allows exactly Google's account-picture paths and
 * nothing else on that host, so this is not an open proxy. The community API
 * rewrites what it returns, which fixes the Android app already installed
 * without an update. Any other address passes through untouched, and a
 * rewritten one passes through again unchanged.
 */

const GOOGLE_PICTURES = "lh3.googleusercontent.com";

/** Width asked of the optimizer: one of Next's default image sizes, and enough for a 40px circle at 3x. */
const WIDTH = 128;

export function avatarSrc(url: string | null | undefined, origin: string = SITE_URL): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const isGooglePicture =
    parsed.protocol === "https:" &&
    parsed.hostname === GOOGLE_PICTURES &&
    /^\/a-?\//.test(parsed.pathname) &&
    parsed.search === "";
  if (!isGooglePicture) return url;
  return `${origin.replace(/\/+$/, "")}/_next/image?url=${encodeURIComponent(url)}&w=${WIDTH}&q=75`;
}
