/**
 * The canonical deployed origin used for every absolute URL Next emits for us:
 * metadataBase (Open Graph + Twitter image, canonical), the sitemap, and
 * robots.txt.
 *
 * Precedence:
 *   1. NEXT_PUBLIC_SITE_URL  — explicit override (set only for a real custom
 *                              domain we actually own).
 *   2. RENDER_EXTERNAL_URL   — auto-injected by Render for every web service
 *                              (e.g. https://purifyapp.onrender.com).
 *   3. Hard-coded onrender   — local dev fallback.
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
    if (/purify\.app/i.test(v)) continue;
    return v;
  }
  return FALLBACK;
}

export const SITE_URL = pick();
