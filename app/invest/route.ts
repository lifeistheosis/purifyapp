import { readFile } from "node:fs/promises";
import path from "node:path";

import { getInvestorLive } from "@/lib/invest/live";
import { buildPayload, injectPayload } from "@/lib/invest/payload";

// The investor overview at /invest. deck.html is one self-contained page (its
// own styles, script and map). The route fills its data block with the live
// numbers, the investor plan and the hand-entered figures, then serves it.
// It is shared by link only: not in the sitemap, not linked from the site,
// and marked noindex both here and in its own <head>.
//
// LIVE, HOURLY. The page is rebuilt at most once an hour (revalidate), so an
// investor who opens it sees numbers no older than that, and a busy day costs
// one set of reads an hour rather than one per visit. If the read fails, the
// page is served with the figures printed in it, never a broken page.
//
// Web only. scripts/native-build.mjs keeps app/invest out of the app bundle.
export const dynamic = "force-static";
export const revalidate = 3600;

// Enforced, and narrower than the site's policy: the page needs its own inline
// style and script, Google Fonts, and the site icon, and nothing else. proxy.ts
// skips /invest so the site-wide report-only policy does not also apply. The
// data block is JSON (type="application/json"), which is never executed, so it
// needs nothing from script-src.
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
  let live = null;
  try {
    live = await getInvestorLive();
  } catch (err) {
    console.error("[invest] live numbers unavailable, serving printed figures:", err);
  }
  return new Response(injectPayload(html, buildPayload(live)), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": CSP,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
