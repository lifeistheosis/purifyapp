import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign the user out, then send them home. POST because sign-out is a
 * state-changing action; the SignInPanel button submits a form with method
 * POST so this stays browser-native and CSRF-resistant by way of the
 * Supabase auth cookies.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
