// Server-side Supabase client for Server Components, Route Handlers, and Server Actions.
// Reads/writes the auth cookies so the session follows the user across SSR requests.
// Uses the anon key, RLS still applies; this is NOT an admin client.
//
// Next 16: cookies() is async, must be awaited before use.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  // Android static export has no request cookies; calling cookies() would force
  // pages dynamic and break output:export. Return a cookie-less anon client so
  // pages render the signed-out shell at build time; the app authenticates
  // client-side at runtime. The website (BUILD_TARGET unset) is unaffected.
  if (process.env.BUILD_TARGET === "android") {
    // Fall back to placeholders so the static export never crashes when the
    // public keys aren't set on the build runner ("URL and Key are required").
    // When the real NEXT_PUBLIC_* values ARE provided at build time they're
    // used and baked into the app; with placeholders the app still builds and
    // renders content offline, only auth/sync stay inert until real keys ship.
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
      { cookies: { getAll: () => [], setAll: () => {} } },
    );
  }
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll throws when called from a Server Component (which is read-only
            // for cookies). Safe to ignore if you have middleware refreshing sessions.
          }
        },
      },
    },
  );
}

/**
 * Auth client for API routes that must work for BOTH the web (cookie session)
 * and the native shell (cross-origin, no cookies). The local-first app on
 * https://localhost can't send purifyapp.net cookies, so it carries the user's
 * Supabase access token in an `Authorization: Bearer` header (see
 * lib/api/client.ts → apiFetch). When that header is present we build a
 * cookie-less client authenticated by it: `auth.getUser()` validates the token
 * and every RLS-scoped `.from()` query runs as that user (supabase-js sets
 * hasCustomAuthorizationHeader from the global header). Otherwise we fall back
 * to the ordinary cookie-based client, so web callers are unchanged.
 */
export async function createClientFromRequest(req: Request) {
  const authHeader =
    req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: { getAll: () => [], setAll: () => {} },
        global: { headers: { Authorization: authHeader } },
      },
    );
  }
  return createClient();
}
