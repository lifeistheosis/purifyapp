"use client";

import type { User } from "@supabase/supabase-js";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { readLocalSessionUser } from "@/lib/supabase/localSession";

/**
 * Auth resolution for AUTH-REQUIRED client surfaces (orders, messages,
 * requests, the account gate). Decides ONLY whether to show the signed-in UI
 * or bounce to sign-in — the actual data reads/writes are RLS-enforced
 * server-side, so this never needs to server-validate the token itself.
 *
 * It reads the LOCAL session (getSession), NOT getUser():
 *   - getUser() ALWAYS makes a network round-trip to /auth/v1/user to
 *     re-validate the token. Right after sign-in that call races the fresh
 *     token / an auto-refresh and can hang or return a retryable fetch error,
 *     which surfaced to real users as "We couldn't confirm your sign-in"
 *     immediately after a *successful* login (F-13, still live after the
 *     lock-only fix: the endpoint was healthy and the fix deployed, yet the
 *     network validation was the fragile part).
 *   - getSession() returns the persisted session straight from storage for a
 *     valid (unexpired) token — no network, so it cannot hang on the network
 *     or fail a validation the gate doesn't need. It only touches the network
 *     to refresh an already-expired token, which the timeout below still
 *     covers.
 *
 * Three honest states, so a transient failure never fakes a sign-out:
 *   signed-in   a local session with a user
 *   signed-out  settled with no session (and no error) — genuinely not signed in
 *   unresolved  could not find out (lock wait past the deadline, a network
 *               failure while refreshing, or a thrown error) — show retry,
 *               never a sign-in prompt
 */
export type ResolvedAuth =
  | { state: "signed-in"; user: User }
  | { state: "signed-out" }
  | { state: "unresolved" };

/** Thrown/displayed by loaders when auth is unresolved; ShopError renders it
 * verbatim above the retry button. */
export const AUTH_UNRESOLVED_MESSAGE =
  "We couldn't confirm your sign-in. Check your connection and try again.";

// Must exceed supabase-js's own 5s lock-acquire timeout: when a jammed
// cross-tab lock forces the resilient lock (lib/supabase/resilientLock.ts)
// into its lockless fallback, the session read needs headroom to still
// settle inside this deadline instead of racing it.
const DEFAULT_TIMEOUT_MS = 8000;

export async function resolveUser(
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ResolvedAuth> {
  // Fast, hang-proof path: the persisted cookie/localStorage session, read
  // synchronously with no network, refresh, or auth lock. For a signed-in
  // user this settles instantly and never stalls (F-13).
  const local = readLocalSessionUser();
  if (local) return { state: "signed-in", user: local };

  const check: Promise<ResolvedAuth> = createClient()
    .auth.getSession()
    .then(({ data, error }) => {
      const user = data.session?.user;
      if (user) return { state: "signed-in", user };
      // A retryable fetch failure (only possible here while refreshing an
      // expired token) means we never reached the auth server — that is
      // "unknown", not "signed out". A clean empty result is a real sign-out.
      if (error && isAuthRetryableFetchError(error)) {
        return { state: "unresolved" };
      }
      return { state: "signed-out" };
    });
  const deadline = new Promise<ResolvedAuth>((resolve) =>
    setTimeout(() => resolve({ state: "unresolved" }), timeoutMs),
  );
  return Promise.race([check, deadline]).catch(() => ({
    state: "unresolved",
  }));
}
