import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { rateLimited, ipKey } from "@/lib/security/ratelimit";
import { isSafeNext } from "@/lib/security/schemas";

/**
 * Auth callback. Handles four sources:
 *   1. Email link via OTP token_hash (signup, recovery, magic-link,
 *      email change)                              → `?token_hash=...&type=...`
 *   2. Email magic-link / signup confirmation     → `?code=...`  (legacy PKCE)
 *   3. OAuth provider (Google, Apple)             → `?code=...`
 *   4. Provider error redirect                    → `?error=...&error_description=...`
 *
 * Why two email styles:
 *   The PKCE `code` flow stores a one-time `code_verifier` in a cookie on
 *   the browser that *initiated* the flow. Mobile mail clients open links
 *   in an in-app browser — a different cookie jar than the one the user
 *   signed up in — so the verifier is absent and `exchangeCodeForSession`
 *   fails with "PKCE code verifier not found in storage." The `token_hash`
 *   OTP flow (`verifyOtp`) carries no client-side state, so it works no
 *   matter which browser opens the link. Email templates should therefore
 *   use `?token_hash={{ .TokenHash }}&type=...`; see
 *   docs/SUPABASE_EMAIL_TEMPLATES.md. `code` is retained for OAuth (always
 *   same-session) and for any confirmation links already sitting in inboxes.
 *
 * On success: establish the session cookie and redirect onward to `?next=`
 * (recovery defaults to `/reset`, everything else to `/account/profile`).
 * On failure: bounce to `/signin` with a human-readable message in `?error=`.
 *
 * Hardened:
 *   - Per-IP rate limit (slows magic-link replay / OAuth-code stuffing).
 *   - `next` is validated against `isSafeNext` (no //, no \\, no control
 *     chars) — defends against open-redirect via mangled paths that
 *     `startsWith("/")` alone wouldn't catch.
 *   - `type` is checked against a fixed allow-list before it reaches
 *     verifyOtp.
 *   - Every redirect uses SITE_URL as the base (existing convention) so
 *     the proxied internal request URL on Render never leaks.
 */

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "recovery",
  "magiclink",
  "email",
  "email_change",
  "invite",
]);

export async function GET(request: NextRequest) {
  const ip = ipKey(request.headers);
  if (await rateLimited(`auth-cb:${ip}`, 60, 20)) {
    return new NextResponse(null, { status: 429 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type");
  const type =
    rawType && OTP_TYPES.has(rawType as EmailOtpType)
      ? (rawType as EmailOtpType)
      : null;
  const rawNext = url.searchParams.get("next");
  // Recovery links must land on the set-a-new-password screen; everything
  // else defaults to the profile.
  const fallbackNext = type === "recovery" ? "/reset" : "/account/profile";
  const safeNext = isSafeNext(rawNext) ? rawNext : fallbackNext;

  const providerError = url.searchParams.get("error");
  const providerErrorDesc = url.searchParams.get("error_description");
  if (providerError) {
    const msg = providerErrorDesc || providerError;
    const errorTarget = safeNext.startsWith("/account")
      ? `${safeNext}${safeNext.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`
      : `/signin?error=${encodeURIComponent(msg)}`;
    return NextResponse.redirect(new URL(errorTarget, SITE_URL));
  }

  const fail = (message: string) =>
    NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent(message)}`, SITE_URL),
    );

  const supabase = await createClient();

  // Preferred path: stateless OTP verification (cross-browser safe).
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) return fail(error.message);
    return NextResponse.redirect(new URL(safeNext, SITE_URL));
  }

  // Legacy / OAuth path: PKCE code exchange (requires same-session verifier).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(error.message);
    return NextResponse.redirect(new URL(safeNext, SITE_URL));
  }

  return fail("Sign-in link is missing its code. Try again.");
}
