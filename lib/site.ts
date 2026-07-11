/**
 * The canonical deployed origin used for every absolute URL Next emits for us:
 * metadataBase (Open Graph + Twitter image, canonical), the sitemap,
 * robots.txt, and all Supabase auth `redirectTo` URLs (signup confirmation,
 * password reset, OAuth callback).
 *
 * Precedence:
 *   1. NEXT_PUBLIC_SITE_URL , explicit override (set only for a real custom
 *                              domain we actually own).
 *   2. RENDER_EXTERNAL_URL  , auto-injected by Render for every web service
 *                              (e.g. https://purifyapp.onrender.com).
 *   3. Hard-coded onrender  , local dev fallback.
 *
 * Defensive guard: we DO NOT own purify.app, so any source that resolves to
 * that host is ignored. This prevents a stale `NEXT_PUBLIC_SITE_URL` env var
 * on the deploy from leaking that domain into our `<meta>` tags and link
 * previews.
 */
const FALLBACK = "https://purifyapp.onrender.com";

function pick(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.RENDER_EXTERNAL_URL,
  ];
  for (const v of candidates) {
    if (!v) continue;
    // Reject `purify.app` (we don't own that domain) and any localhost
    // value (e.g. Render's internal :10000 port if it ever leaks into
    // the env, or a stale `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
    // copied from a dev .env into production). Either would silently
    // route every Supabase auth callback to a non-existent host.
    if (/purify\.app/i.test(v)) continue;
    if (/^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(v)) continue;
    return v;
  }
  return FALLBACK;
}

export const SITE_URL = pick();

/** Google Play listing for the Android app (where Purify Plus is bought,
 *  since the subscription is billed through Google Play). */
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=net.purifyapp.purify";

/** Google Play subscription-management page for an existing subscriber. */
export const PLAY_MANAGE_SUBSCRIPTION_URL =
  "https://play.google.com/store/account/subscriptions?package=net.purifyapp.purify";

/**
 * The canonical origin used for client-side Supabase auth flows. Returns
 * the build-time SITE_URL when running on a deployed host (anything that
 * isn't localhost), and falls back to `window.location.origin` only during
 * local development so the dev flow stays self-contained.
 *
 * Use this everywhere `emailRedirectTo` or `redirectTo` is passed to
 * supabase.auth.*, without it, a user who signs up on `localhost:3000`
 * gets a confirmation email pointing at localhost, and even production
 * users get pointed at the Supabase project's stale Site URL setting
 * whenever the dashboard allowlist doesn't match.
 */
export function authOrigin(): string {
  // SITE_URL was resolved at build time. On the client, NEXT_PUBLIC_SITE_URL
  // is the only env var inlined into the bundle; RENDER_EXTERNAL_URL is
  // server-only. So on the deployed client SITE_URL = NEXT_PUBLIC_SITE_URL
  // or the FALLBACK, never localhost, exactly the behavior we want.
  if (typeof window === "undefined") return SITE_URL;
  const here = window.location.origin;
  // Only fall back to window.location.origin during local development.
  // Any deployed origin uses SITE_URL so the auth provider can't send a
  // localhost link out into the world.
  if (here.startsWith("http://localhost") || here.startsWith("http://127.")) {
    return here;
  }
  return SITE_URL;
}
