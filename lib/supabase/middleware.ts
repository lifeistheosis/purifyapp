// Refreshes the Supabase auth session cookie on every request and
// enforces two auth gates:
//   - signed-in routes that require auth → redirect to /signin
//   - signed-in users without a password set (legacy magic-link
//     accounts) → redirect to /set-password until they pick one
//
// Called from middleware.ts at the project root so RSC pages always
// see a fresh session and routing decisions happen before any page
// shell renders.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Paths whose page requires a signed-in user. */
const AUTH_REQUIRED_PREFIXES = ["/account", "/saved", "/set-password"];

/** Auth-flow surfaces; signed-in users hitting these are redirected on. */
const AUTH_SURFACES = new Set([
  "/signin",
  "/signup",
  "/forgot",
  "/reset",
]);

function requiresAuth(pathname: string): boolean {
  // /account by itself is the public chooser; only sub-paths are gated.
  if (pathname === "/account") return false;
  return AUTH_REQUIRED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touch the user so the auth token refreshes if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-out users hitting an auth-required surface → /signin.
  if (!user && requiresAuth(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Signed-in users hitting an auth flow surface → /account/profile.
  // (Exception: /reset, which they may legitimately visit from a
  // recovery email even while signed in.)
  if (user && AUTH_SURFACES.has(pathname) && pathname !== "/reset") {
    const url = request.nextUrl.clone();
    url.pathname = "/account/profile";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Forced password gate: if signed-in and `has_password` is false,
  // redirect to /set-password (unless already there, or hitting an
  // auth surface, or on /reset). The profiles read is best-effort —
  // if it fails (e.g. migration not yet applied), we fail open and
  // let the request pass.
  if (user && requiresAuth(pathname) && pathname !== "/set-password") {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("has_password")
        .eq("id", user.id)
        .maybeSingle();
      if (profile && profile.has_password === false) {
        const url = request.nextUrl.clone();
        url.pathname = "/set-password";
        url.search = "";
        return NextResponse.redirect(url);
      }
    } catch {
      /* swallow — fail open */
    }
  }

  return response;
}
