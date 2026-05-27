import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

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
 * IMPORTANT: every redirect built here uses the constant SITE_URL as
 * the base, never the incoming request's `url.origin`. On Render
 * (and most managed Node hosts), the request URL the server sees is
 * the proxied internal address — `http://localhost:10000/...` —
 * because the platform's reverse proxy forwards traffic to the
 * container's internal port. Using `url.origin` to build the
 * redirect URL would then send the user-agent to localhost, which
 * isn't reachable from a browser.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/account/profile";
  const safeNext = next.startsWith("/") ? next : "/account/profile";

  // OAuth providers redirect back with ?error= when the user cancels
  // or when the provider config is bad. Surface it cleanly. If the
  // original ?next= points at an /account/* page (e.g. the Security
  // tab during a Connect-Google attempt), bounce back to *that* page
  // with the error in the query — that's where the user started, and
  // OAuthConnectionsCard already knows how to read /account-side
  // errors. Falling through to /signin is right only for sign-in /
  // sign-up flows that originated unsigned.
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
