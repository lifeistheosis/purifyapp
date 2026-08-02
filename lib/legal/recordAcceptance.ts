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
    });
  } catch {
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
