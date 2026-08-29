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

/** Past a slow mobile round trip, short of a force-quit. */
const TIMEOUT_MS = 12_000;

/**
 * Run the acceptance POST under a deadline that covers the WHOLE call.
 *
 * Bounding it through RequestInit.signal alone was wrong twice over.
 *
 * REACH. A signal binds to fetch and to nothing before it, and on native
 * apiFetch first awaits createClient().auth.getSession() to mint the Bearer
 * header. auth-js refreshes an expired session inline there, over the network,
 * with no deadline of its own, and resilientNavigatorLock caps lock
 * ACQUISITION rather than the work inside it. So the one path this fix names as
 * riskiest could still park on "Creating account..." forever, with the timer
 * expiring against a fetch that had not been issued yet. OAuthButtons already
 * carries a note on this exact shape: apiFetch mints a bearer behind the
 * cross-tab lock and carries no deadline.
 *
 * SUPPORT. AbortSignal.timeout is Safari 16 and IPHONEOS_DEPLOYMENT_TARGET is
 * 15.0, so on an iOS 15 device the bare call is a TypeError, thrown inside the
 * try below and returned as AcceptanceNotRecordedError, which aborts sign-up. A
 * bound added to stop a hang would have stopped every account on those devices.
 *
 * Owning the controller answers both at once and needs no feature detection.
 * AbortController is Safari 11.1, comfortably under the deployment target; the
 * race bounds the whole operation including getSession; and the abort still
 * cancels the request rather than merely walking away from it.
 */
async function postAcceptance(body: string): Promise<Response> {
  const controller =
    typeof AbortController === "undefined" ? undefined : new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller?.abort();
      reject(new Error("acceptance deadline"));
    }, TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      apiFetch("/api/legal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller?.signal,
      }),
      deadline,
    ]);
  } finally {
    // Cleared on the success path too, or every completed sign-up leaves a 12s
    // timer holding the controller for no reason.
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Record a clickwrap acceptance. Resolves only when the server confirms it,
 * throws AcceptanceNotRecordedError otherwise. Never swallow this: a caller
 * that catches and continues has recreated the original bug.
 */
export async function recordAcceptance(
  context: string,
  email: string,
): Promise<void> {
  let res: Response;
  try {
    res = await postAcceptance(JSON.stringify({ context, email }));
  } catch {
    // A deadline, an abort and a dropped connection all land here, and
    // AcceptanceNotRecordedError is the right answer to each of them: nothing
    // was written, which is exactly what it means.
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
