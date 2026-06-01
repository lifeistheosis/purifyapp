import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  isLocaleReady,
  negotiateFromAcceptLanguage,
} from "@/lib/i18n/locales";
import { buildCsp, generateNonce, NONCE_HEADER } from "@/lib/security/headers";

const LOCALE_COOKIE = "purify_locale";

export async function proxy(request: NextRequest) {
  // Per-request nonce for the Content-Security-Policy. Thread it via a
  // request header so the root layout can read it from headers() and
  // attach it to any inline <script> it renders.
  const nonce = generateNonce();
  request.headers.set(NONCE_HEADER, nonce);

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
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // Attach the CSP header. Ship as Report-Only first so violations are
  // collected without breaking the site. Flip to "Content-Security-Policy"
  // (no -Report-Only) once /api/csp-report has been clean for a week.
  const csp = buildCsp(nonce);
  response.headers.set("Content-Security-Policy-Report-Only", csp);
  // Echo the nonce so server components can read it via headers().
  response.headers.set(NONCE_HEADER, nonce);

  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals + static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
