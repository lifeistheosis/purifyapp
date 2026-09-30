import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { recordClick } from "@/lib/ambassadors/clicks";
import { REF_COOKIE, REF_MAX_AGE_S, refFromUrl } from "@/lib/ambassadors/referral";
import { checkoutReturnOrigin } from "@/lib/site";
import { updateSession } from "@/lib/supabase/middleware";
import {
  isLocaleSelectable,
  negotiateFromAcceptLanguage,
} from "@/lib/i18n/locales";
import { buildCsp, generateNonce, NONCE_HEADER } from "@/lib/security/headers";

const LOCALE_COOKIE = "purify_locale";

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  // Ambassador links (lib/ambassadors/referral.ts): remember the code in a
  // first-party, HTTP-only cookie for 30 days, count the visit, and send the
  // reader on to the same page without `?ref=`. The redirect's origin is the
  // canonical one (checkoutReturnOrigin): behind Render's proxy the request's
  // own origin is http://localhost:10000, and a redirect built from it would
  // strand them. Next requires the Location to be absolute.
  if (request.method === "GET" && !request.nextUrl.pathname.startsWith("/api/")) {
    const ref = refFromUrl(new URL(request.url));
    if (ref) {
      const origin = checkoutReturnOrigin(new URL(request.url).origin);
      const redirect = NextResponse.redirect(new URL(`${ref.clean.pathname}${ref.clean.search}`, origin), 307);
      if (ref.code) {
        redirect.cookies.set(REF_COOKIE, ref.code, {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: REF_MAX_AGE_S,
        });
        // A reader already carrying this code is a return visit, not a new click.
        if (request.cookies.get(REF_COOKIE)?.value !== ref.code) {
          event.waitUntil(recordClick(ref.code));
        }
      }
      return redirect;
    }
  }

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
  // Keep a cookie the user has actively chosen, including editorial-preview
  // locales; only (re)negotiate when there is no usable selection yet.
  if (!existing || !isLocaleSelectable(existing)) {
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
    // Skip Next.js internals + static assets, and /invest, a self-contained
    // page that carries its own Content-Security-Policy (app/invest/route.ts)
    // and needs no session or locale.
    "/((?!_next/static|_next/image|favicon.ico|invest(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
