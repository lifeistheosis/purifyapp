import "server-only";

import { TERMS_VERSION } from "@/lib/legal/version";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Record that a signed-in user has accepted the current Terms.
 *
 * Called from the auth callback, which is the only place an OAuth sign-up is
 * observable at all: the provider redirect lands there, and no client code
 * runs in between. Every Google account before this was created with no
 * acceptance row anywhere.
 *
 * ── Why it is safe to call on every sign-in ────────────────────────────────
 *
 * The callback fires for sign-ins, not just the first one, so this must be
 * idempotent. `terms_acceptances_signup_unique` (a partial unique index on
 * user_id + terms_version where context = 'signup') makes the repeat a
 * conflict, and `ignoreDuplicates` turns the conflict into a no-op.
 *
 * That also gives re-acceptance for free: when TERMS_VERSION is bumped, the
 * next sign-in records a fresh row against the new version. That is honest
 * rather than fabricated, because the sign-in surface carries the notice that
 * continuing constitutes agreement (components/auth/OAuthButtons.tsx).
 *
 * ── Why it never throws ────────────────────────────────────────────────────
 *
 * A failure here must not strand someone mid-sign-in on an error page. But it
 * is logged rather than swallowed, because "fire and forget plus an empty
 * catch" is exactly how the original hole stayed invisible for 572 accounts.
 * Only the write is best-effort; the notice the reader saw is not.
 */
export async function recordSignInAcceptance(
  userId: string,
  email: string | null,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("terms_acceptances").upsert(
      {
        user_id: userId,
        email,
        context: "signup",
        terms_version: TERMS_VERSION,
      },
      {
        onConflict: "user_id,terms_version",
        ignoreDuplicates: true,
      },
    );
    if (error) {
      console.warn("[legal] sign-in acceptance not recorded", error.message);
    }
  } catch (e) {
    console.warn("[legal] sign-in acceptance threw", (e as Error).message);
  }
}
