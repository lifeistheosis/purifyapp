"use client";

import type { User } from "@supabase/supabase-js";
import { isAuthRetryableFetchError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

/**
 * Timeout-aware auth resolution for AUTH-REQUIRED client surfaces (orders,
 * messages, requests, the account gate). supabase-js's getUser() waits on a
 * cross-tab navigator.locks auth lock, and a lock held by another tab can
 * block it indefinitely — observed live 2026-07-11 (F-13): pages sat on
 * their skeletons forever with no error while data APIs returned 200.
 *
 * The product page's display-only Plus check races the same call and fails
 * OPEN to false (lib/entitlements/client.ts) because nothing there depends
 * on being right. Auth-required pages must NOT copy that: timing out to
 * "signed out" shows a sign-in prompt to a signed-in user (a fake sign-out).
 * This resolver reports the honest third state instead:
 *
 *   signed-in   getUser() settled with a user
 *   signed-out  getUser() settled without one (no session, or a genuine
 *               auth failure like an expired refresh token)
 *   unresolved  we could not find out: lock wait past the deadline, a
 *               network failure, or a thrown error — show retry, never a
 *               sign-in prompt
 */
export type ResolvedAuth =
  | { state: "signed-in"; user: User }
  | { state: "signed-out" }
  | { state: "unresolved" };

/** Thrown/displayed by loaders when auth is unresolved; ShopError renders it
 * verbatim above the retry button. */
export const AUTH_UNRESOLVED_MESSAGE =
  "We couldn't confirm your sign-in. Check your connection and try again.";

const DEFAULT_TIMEOUT_MS = 5000;

export async function resolveUser(
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ResolvedAuth> {
  const check: Promise<ResolvedAuth> = createClient()
    .auth.getUser()
    .then(({ data, error }) => {
      if (data.user) return { state: "signed-in", user: data.user };
      // A retryable fetch failure means we never reached the auth server —
      // that is "unknown", not "signed out". Every other settled answer
      // (missing session, expired/invalid token) is a genuine signed-out.
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
