import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  isLocaleReady,
  negotiateFromAcceptLanguage,
} from "@/lib/i18n/locales";

const LOCALE_COOKIE = "purify_locale";

export async function middleware(request: NextRequest) {
  // First: hand the request to the Supabase auth middleware so the
  // session cookie is refreshed before any page renders.
  const response = await updateSession(request);

  // Then: if the user has no locale cookie yet, negotiate one from
  // their Accept-Language header and set it. Subsequent requests just
  // read the cookie. No URL rewriting — locale is cookie-driven.
  const existing = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!existing || !isLocaleReady(existing)) {
    const negotiated = negotiateFromAcceptLanguage(
      request.headers.get("accept-language"),
    );
    response.cookies.set(LOCALE_COOKIE, negotiated, {
      path: "/",
      // Locale is non-sensitive; readable from the client so the
      // locale switcher can mirror state in the DOM if it wants.
      httpOnly: false,
      sameSite: "lax",
      // One year — locale rarely changes; users who want to change
      // it use the switcher in the footer.
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals + static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
