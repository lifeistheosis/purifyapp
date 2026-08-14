// Browser-side Supabase client.
// Safe to import from Client Components ("use client").
// Uses the anon (public) key, RLS policies determine what the user can read/write.

import { createBrowserClient } from "@supabase/ssr";

import { isNativeClient } from "@/lib/platform/native";
import { resilientNavigatorLock } from "./resilientLock";

/**
 * Where the session lives inside the native shells.
 *
 * @supabase/ssr keeps the session in `document.cookie` by default. The iOS
 * shell serves the bundle from `capacitor://localhost`, which is neither an
 * HTTP-family origin nor a secure context, and WKWebView does not back
 * document.cookie there: writes appear to succeed and the value is gone on the
 * next read. So on iOS the session existed only in the JS heap. It survived a
 * soft navigation and died on every reload, hard navigation and relaunch, which
 * is exactly what Apple saw when they rejected 1.0 build 12 under 2.1(a), "The
 * Sign in feature did not function properly".
 *
 * The previous attempt fixed this by setting `iosScheme: "https"` to buy a
 * secure context. That crashes the app on launch: WKWebView refuses a scheme
 * handler for a scheme it already handles, and the resulting ObjC exception is
 * uncatchable from Swift. See the note in capacitor.config.ts.
 *
 * localStorage IS backed on a custom-scheme origin, so the store moves there.
 * This is scheme-independent, which is the point: it cannot be undone by a
 * future change to how the shell is served.
 *
 * Native only. On the web the cookie store is load-bearing, because the server
 * reads the same cookies to resolve the session during SSR and in route
 * handlers. Moving the web off cookies would sign every reader out server-side.
 * Native never needed them: `lib/api/client.ts` sends a Bearer token, and
 * `lib/api/cors.ts` records that "authentication rides on a Bearer token, never
 * cookies".
 */
const NATIVE_SESSION_KEY = "purify.supabase.auth";

type StoredCookie = { name: string; value: string };

function readStore(): StoredCookie[] {
  try {
    const raw = window.localStorage.getItem(NATIVE_SESSION_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredCookie[]) : [];
  } catch {
    // Quota, privacy mode, or a value some older build left behind in another
    // shape. An unreadable store must mean "signed out", never a thrown error
    // on every Supabase call.
    return [];
  }
}

function writeStore(cookies: StoredCookie[]): void {
  try {
    window.localStorage.setItem(NATIVE_SESSION_KEY, JSON.stringify(cookies));
  } catch {
    // Nothing useful to do. Failing to persist degrades to the old behaviour
    // (session for this run only); throwing would break sign-in outright.
  }
}

/** A cookie store backed by localStorage, in the shape @supabase/ssr expects. */
const nativeCookieStore = {
  getAll(): StoredCookie[] {
    return readStore();
  },
  setAll(
    toSet: { name: string; value: string; options?: { maxAge?: number } }[],
  ): void {
    const merged = new Map(readStore().map((c) => [c.name, c.value]));
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
    writeStore([...merged].map(([name, value]) => ({ name, value })));
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
