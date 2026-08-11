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
 * Origin for checkout return URLs (Stripe success_url / cancel_url).
 * Behind Render's proxy the request presents itself as
 * `http://localhost:10000` (same hop documented in the signout route), so
 * deriving these URLs from the request origin strands buyers on a dead
 * localhost page after paying or cancelling — observed live 2026-07-11.
 * Use the canonical SITE_URL everywhere except genuine local development,
 * where the request origin keeps the dev loop self-contained.
 */
export function checkoutReturnOrigin(requestOrigin: string): string {
  const isLocal = /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(
    requestOrigin,
  );
  if (isLocal && process.env.NODE_ENV === "development") return requestOrigin;
  return SITE_URL;
}

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

/**
 * The canonical origin for any link the reader copies, shares, or hands to
 * the system share sheet.
 *
 * Same failure as the confirmation-email bug that `authOrigin()` exists to
 * prevent, one surface over. The native shell serves the bundled export from
 * `https://localhost` (Android) or `capacitor://localhost` (iOS), so every
 * copy-link and share action built from `window.location` handed the reader
 * a link that resolves nowhere on any device but their own, and not even
 * there once the app is closed. Observed on Android 2026-08-11; iOS is the
 * same code and the same shell, so it was never platform-specific.
 *
 * A copied link only exists to leave the device, so unlike `authOrigin()`
 * the local-development fallback is gated on NODE_ENV as well: a real
 * `https://localhost` from the shell can never satisfy it, no matter how the
 * origin string is spelled.
 */
export function shareOrigin(): string {
  if (typeof window === "undefined") return SITE_URL;
  if (process.env.NODE_ENV !== "development") return SITE_URL;
  // The same dev-only escape hatch isNativeClient() honors
  // (lib/platform/native.ts). With localStorage["purify:force-native"] = "1"
  // a dev browser simulates the shell, which is the only way to walk this
  // flow without installing an APK. Read inline rather than imported: that
  // module is "use client" and lib/site.ts is also imported by server code
  // (lib/seo/jsonld.ts, lib/shop/orderEmails.ts).
  try {
    if (window.localStorage.getItem("purify:force-native") === "1") {
      return SITE_URL;
    }
  } catch {
    // localStorage can throw in a sandboxed frame; fall through.
  }
  const here = window.location.origin;
  if (here.startsWith("http://localhost") || here.startsWith("http://127.")) {
    return here;
  }
  return SITE_URL;
}

/**
 * Absolute, shareable URL for an in-app path.
 *
 * Accepts what the call sites already hold: a root-relative path, optionally
 * with a hash. The native export is built with `trailingSlash: true`, so
 * `window.location.pathname` inside the shell reads `/history/foo/` and can
 * resolve to the on-disk `index.html`; both are normalized away so the link
 * that leaves the device is the one purifyapp.net actually serves.
 */
export function shareLink(path: string): string {
  const origin = shareOrigin();
  let parsed: URL;
  try {
    parsed = new URL(path, origin);
  } catch {
    return origin;
  }
  // Only the path, query, and hash survive. An absolute URL handed in keeps
  // its route and loses its host, so a caller passing window.location.href
  // from inside the shell cannot smuggle `localhost` back through.
  let route = parsed.pathname.replace(/\/index\.html$/i, "/");
  if (route.length > 1) route = route.replace(/\/+$/, "");
  if (!route.startsWith("/")) route = `/${route}`;
  return new URL(`${route}${parsed.search}${parsed.hash}`, origin).toString();
}

/** The current in-app location as a shareable absolute URL. */
export function shareCurrentLink(): string {
  if (typeof window === "undefined") return shareOrigin();
  return shareLink(window.location.href);
}
