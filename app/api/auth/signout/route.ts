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
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", SITE_URL));
}
