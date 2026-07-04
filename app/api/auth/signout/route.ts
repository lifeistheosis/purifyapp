import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

/**
 * Sign the user out, then send them home. POST because sign-out is a
 * state-changing action; the SignInPanel button submits a form with method
 * POST so this stays browser-native and CSRF-resistant by way of the
 * Supabase auth cookies.
 *
 * Redirect base is SITE_URL, not request.url, so Render's internal
 * proxy hop (which presents the request as `http://localhost:10000`)
 * doesn't leak into the redirect Location header sent to the browser.
 */
export async function POST() {
  const supabase = await createClient();
  try {
    // scope: "local" expires THIS session's cookies (with the same attributes
    // the server set them with, which the browser client can't reliably match)
    // without the global-revocation round-trip that can hang when Supabase is
    // slow or down. Signing out of every device stays a separate action
    // (/api/auth/signout-others). Either way the auth cookies are cleared here,
    // so the redirect home rebuilds as signed-out.
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // The cookie-clearing Set-Cookie headers are already staged; send them home.
  }
  return NextResponse.redirect(new URL("/", SITE_URL));
}
