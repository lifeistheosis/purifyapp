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
 * localStorage IS backed on a custom-scheme origin, so the store moves there.
 *
 * This module holds only the key and the raw accessors, with no @supabase/ssr
 * import, so `lib/supabase/localSession.ts` can read the same store without
 * pulling the Supabase client into every consumer of its synchronous fast path.
 */

/** The single localStorage key the native shells keep the session under. */
export const NATIVE_SESSION_KEY = "purify.supabase.auth";

/**
 * One entry of the store. The `name` values are the ordinary
 * `sb-<ref>-auth-token[.n]` cookie names @supabase/ssr would otherwise write to
 * document.cookie, so anything that understands those names understands these.
 */
export type StoredCookie = { name: string; value: string };

/**
 * The store's contents, or `[]` for anything unreadable.
 *
 * Quota, privacy mode, or a value some older build left behind in another shape
 * all resolve to "signed out" rather than a thrown error on every Supabase call.
 * Entries that are not `{name, value}` pairs are dropped rather than trusted:
 * a half-written array must not reach a consumer as a session.
 */
export function readNativeStore(): StoredCookie[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(NATIVE_SESSION_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is StoredCookie =>
        !!c &&
        typeof (c as StoredCookie).name === "string" &&
        typeof (c as StoredCookie).value === "string",
    );
  } catch {
    return [];
  }
}

/** Replace the store. Failing to persist degrades to a session that lasts only
 * this run; throwing would break sign-in outright. */
export function writeNativeStore(cookies: StoredCookie[]): void {
  try {
    localStorage.setItem(NATIVE_SESSION_KEY, JSON.stringify(cookies));
  } catch {
    /* nothing useful to do */
  }
}
