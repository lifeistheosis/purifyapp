"use client";

// Recording that someone accepted the Terms, in a way that cannot silently
// not happen.
//
// Both sign-up paths used to do this:
//
//     void fetch("/api/legal/accept", {...}).catch(() => {});
//
// Three separate reasons that recorded nothing in the native app. The path is
// relative, so inside the shell it resolves to https://localhost where
// app/api is stashed out of the export. The call is not awaited. The catch is
// empty. So every account created through the Android app has no row in
// terms_acceptances, and nothing anywhere reported a problem.
//
// ── Ordering, and what a partial account means ─────────────────────────────
//
// The acceptance is recorded BEFORE `supabase.auth.signUp`, and a failure
// aborts the sign-up. That ordering is deliberate, because the two possible
// half-states are not equally bad:
//
//   - an acceptance row with no account: harmless. It records that a person
//     at that address agreed to a version of the Terms at a moment in time,
//     which is true, and no account exists to be governed by it. These rows
//     are expected and should not be cleaned up as though they were errors.
//
//   - an account with no acceptance row: the thing we cannot have. It is an
//     account we cannot show agreed to anything.
//
// So the failure mode is a person who has to press the button again, not an
// account we cannot account for.
//
// ── What this record is, and is not ────────────────────────────────────────
//
// This is a clickwrap acceptance of a specific TERMS_VERSION at a specific
// time. It is not a general-purpose consent record, and it should not be
// described as covering GDPR consent for processing: those are different
// questions with different lawful bases, and the checkout acceptance
// (lib/shop/checkout.ts) is a third, separate record. Keep them distinct.

import { apiFetch } from "@/lib/api/client";

export class AcceptanceNotRecordedError extends Error {
  constructor() {
    super(
      "We couldn't record your agreement to the Terms. Please try again.",
    );
    this.name = "AcceptanceNotRecordedError";
  }
}

/**
 * Record a clickwrap acceptance. Resolves only when the server confirms it,
 * throws AcceptanceNotRecordedError otherwise. Never swallow this: a caller
 * that catches and continues has recreated the original bug.
 */
/** Past a slow mobile round trip, short of a force-quit. */
const TIMEOUT_MS = 12_000;

export async function recordAcceptance(
  context: string,
  email: string,
): Promise<void> {
  let res: Response;
  try {
    res = await apiFetch("/api/legal/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, email }),
      // BOUNDED, because this runs BEFORE the account is created and the
      // caller awaits it. Without a limit a flaky connection left the sign-up
      // button reading "Creating account…" until the browser gave up, which is
      // a wait with no end and no way out. A reader reported it as the page
      // freezing. Inside the native shell this is a cross-origin call to
      // purifyapp.net, so it fails more often than a same-origin one would.
      //
      // Failing fast is correct rather than merely kinder: the caller
      // deliberately ABORTS sign-up when acceptance is not recorded, so the
      // only outcomes are "recorded" and "tell them to try again". Hanging
      // serves neither. 12s is past a slow mobile round trip and well short of
      // the point where somebody force-quits the app.
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // An abort lands here too, and AcceptanceNotRecordedError is the right
    // answer for it: nothing was written, which is exactly what it means.
    throw new AcceptanceNotRecordedError();
  }

  // The route answers 200 with { ok: false } on a write failure, so the status
  // alone is not the answer.
  let body: { ok?: unknown } = {};
  try {
    body = (await res.json()) as { ok?: unknown };
  } catch {
    throw new AcceptanceNotRecordedError();
  }
  if (!res.ok || body.ok !== true) throw new AcceptanceNotRecordedError();
}

/**
 * Record the acceptance for an OAuth sign-in that completed IN THE APP.
 *
 * The web has a server-side moment where this can be observed: the provider
 * redirects to /api/auth/callback, which calls recordSignInAcceptance. The
 * native app has no such moment. It calls `supabase.auth.signInWithIdToken`
 * directly from the WebView, the callback route never runs, and so the P0-5b
 * fix, written after 572 accounts were found to have agreed to nothing, landed
 * on web only. Android has shipped with that hole ever since, and iOS would
 * have launched repeating it.
 *
 * Unlike recordAcceptance above, this does NOT throw, and the difference is not
 * an inconsistency. For an email sign-up the record is written BEFORE the
 * account, so refusing to continue leaves no account behind. Here the account
 * already exists by the time a token can be exchanged, so throwing would strand
 * someone who is already signed in on an error screen and still not produce the
 * row. Best-effort and logged is what the server side does for the same reason.
 *
 * Idempotent: /api/legal/accept upserts for a signed-in signup, so calling this
 * on every sign-in is a no-op after the first, and records a fresh row when
 * TERMS_VERSION is bumped.
 */
export async function recordNativeSignInAcceptance(
  email: string | null,
): Promise<void> {
  try {
    const res = await apiFetch("/api/legal/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: "signup", email: email ?? undefined }),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: unknown };
    if (!res.ok || body.ok !== true) {
      // Logged, never swallowed: an empty catch is how the original hole
      // stayed invisible.
      console.warn("[legal] native sign-in acceptance not recorded");
    }
  } catch (e) {
    console.warn(
      "[legal] native sign-in acceptance threw",
      (e as Error).message,
    );
  }
}
