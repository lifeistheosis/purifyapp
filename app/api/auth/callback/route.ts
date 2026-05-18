import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link callback. Supabase Auth sends the user back here with a `code`
 * query param; we exchange it for a session cookie and redirect to either
 * the requested `next` URL or /account.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/account";
  const safeNext = next.startsWith("/") ? next : "/account";

  if (!code) {
    return NextResponse.redirect(
      new URL(`/account?error=missing_code`, url.origin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/account?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
