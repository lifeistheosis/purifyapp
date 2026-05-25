import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback. Handles three sources:
 *   1. Email magic-link / signup confirmation  → `?code=...`
 *   2. OAuth provider (Google, Apple)          → `?code=...`
 *   3. Provider error redirect                 → `?error=...&error_description=...`
 *
 * On success: exchange the code for a session cookie and redirect
 * onward to `?next=` (default `/account/profile`). On failure: bounce
 * to `/signin` with a human-readable message in `?error=`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/account/profile";
  const safeNext = next.startsWith("/") ? next : "/account/profile";

  // OAuth providers redirect back with ?error= when the user cancels
  // or when the provider config is bad. Surface it cleanly.
  const providerError = url.searchParams.get("error");
  const providerErrorDesc = url.searchParams.get("error_description");
  if (providerError) {
    const msg = providerErrorDesc || providerError;
    return NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent(msg)}`, url.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/signin?error=${encodeURIComponent("Sign-in link is missing its code. Try again.")}`,
        url.origin,
      ),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
