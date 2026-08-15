// Browser-side Supabase client.
// Safe to import from Client Components ("use client").
// Uses the anon (public) key, RLS policies determine what the user can read/write.

import { createBrowserClient } from "@supabase/ssr";

import { isNativeClient } from "@/lib/platform/native";
import {
  readNativeStore,
  writeNativeStore,
  type StoredCookie,
} from "./nativeStore";
import { resilientNavigatorLock } from "./resilientLock";

/**
 * The native session store, in the shape @supabase/ssr expects.
 *
 * The key, the accessors and the reason the shells cannot use document.cookie
 * live in lib/supabase/nativeStore.ts, so the synchronous reader in
 * lib/supabase/localSession.ts can read the same store without importing this
 * module and dragging @supabase/ssr along with it.
 *
 * The previous attempt at the same problem set `iosScheme: "https"` to buy a
 * secure context. That crashes the app on launch: WKWebView refuses a scheme
 * handler for a scheme it already handles, and the resulting ObjC exception is
 * uncatchable from Swift. See the note in capacitor.config.ts.
 *
 * Native only. On the web the cookie store is load-bearing, because the server
 * reads the same cookies to resolve the session during SSR and in route
 * handlers. Moving the web off cookies would sign every reader out server-side.
 * Native never needed them: `lib/api/client.ts` sends a Bearer token, and
 * `lib/api/cors.ts` records that "authentication rides on a Bearer token, never
 * cookies".
 */
const nativeCookieStore = {
  getAll(): StoredCookie[] {
    return readNativeStore();
  },
  setAll(
    toSet: { name: string; value: string; options?: { maxAge?: number } }[],
  ): void {
    const merged = new Map(readNativeStore().map((c) => [c.name, c.value]));
    for (const cookie of toSet) {
      // @supabase/ssr expresses a delete as maxAge 0, and sometimes as an
      // empty value. Treat both as a delete, or a signed-out reader keeps a
      // dead entry that later parses as a session.
      if (cookie.options?.maxAge === 0 || cookie.value === "") {
        merged.delete(cookie.name);
      } else {
        merged.set(cookie.name, cookie.value);
      }
    }
    writeNativeStore([...merged].map(([name, value]) => ({ name, value })));
  },
};

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // F-13 root fix: a cross-tab auth lock jammed by a stuck tab must
        // degrade to running lockless, not brick every auth call in every
        // other tab. See lib/supabase/resilientLock.ts.
        lock: resilientNavigatorLock,
      },
      // Web keeps document.cookie so the server can read the session. Native
      // moves to localStorage because WKWebView will not back cookies on the
      // shell's origin. isNativeClient() returns false during SSR, so the
      // server always takes the cookie path.
      ...(isNativeClient() ? { cookies: nativeCookieStore } : {}),
    },
  );
}
