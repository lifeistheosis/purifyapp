import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { rateLimited, ipKey } from "@/lib/security/ratelimit";
import { isSafeNext } from "@/lib/security/schemas";

/**
 * Auth callback. Handles three sources:
 *   1. Email magic-link / signup confirmation  → `?code=...`
 *   2. OAuth provider (Google, Apple)          → `?code=...`
 *   3. Provider error redirect                 → `?error=...&error_description=...`
 *
 * On success: exchange the code for a session cookie and redirect
 * onward to `?next=` (default `/account/profile`). On failure: bounce
 * to `/signin` with a human-readable message in `?error=`.
 *
 * Hardened:
 *   - Per-IP rate limit (slows magic-link replay / OAuth-code stuffing).
 *   - `next` is validated against `isSafeNext` (no //, no \\, no control
 *     chars) — defends against open-redirect via mangled paths that
 *     `startsWith("/")` alone wouldn't catch.
 *   - Every redirect uses SITE_URL as the base (existing convention) so
 *     the proxied internal request URL on Render never leaks.
 */
export async function GET(request: NextRequest) {
  const ip = ipKey(request.headers);
  if (await rateLimited(`auth-cb:${ip}`, 60, 20)) {
    return new NextResponse(null, { status: 429 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawNext = url.searchParams.get("next");
  const safeNext = isSafeNext(rawNext) ? rawNext : "/account/profile";

  const providerError = url.searchParams.get("error");
  const providerErrorDesc = url.searchParams.get("error_description");
  if (providerError) {
    const msg = providerErrorDesc || providerError;
    const errorTarget = safeNext.startsWith("/account")
      ? `${safeNext}${safeNext.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`
      : `/signin?error=${encodeURIComponent(msg)}`;
    return NextResponse.redirect(new URL(errorTarget, SITE_URL));
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/signin?error=${encodeURIComponent("Sign-in link is missing its code. Try again.")}`,
        SITE_URL,
      ),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent(error.message)}`, SITE_URL),
    );
  }

  return NextResponse.redirect(new URL(safeNext, SITE_URL));
}
