import { readFile } from "node:fs/promises";
import path from "node:path";

// The investor overview at /invest. deck.html is one self-contained page (its
// own styles, script and map), served as-is so it is exactly the deck that was
// reviewed. It is shared by link only: not in the sitemap, not linked from the
// site, and marked noindex both here and in its own <head>.
//
// Web only. scripts/native-build.mjs keeps app/invest out of the app bundle.
export const dynamic = "force-static";

// Enforced, and narrower than the site's policy: the page needs its own inline
// style and script, Google Fonts, and the site icon, and nothing else. proxy.ts
// skips /invest so the site-wide report-only policy does not also apply.
const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

export async function GET() {
  const html = await readFile(
    path.join(process.cwd(), "app", "invest", "deck.html"),
    "utf8",
  );
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CSP,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
