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
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
