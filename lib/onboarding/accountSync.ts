"use client";

// The reader's space, copied to their account (user_metadata.purify_space) so
// a new device they sign in on starts from the same answers. The device copy
// is still the one every surface reads; this is the backup. Filling a device
// from it is fillSpaceFromAccount in ./state.ts, run on sign-in by
// lib/profile/preferences.ts.
//
// user_metadata rather than a profiles column: it needs no migration, and it
// arrives with the session, so a fresh device can read it without a query.

import { pushProfilePrefs } from "@/lib/profile/preferences";
import { createClient } from "@/lib/supabase/client";
import { ONBOARDING_VERSION, readFastingRule, readIntent, readLevel } from "./state";

/**
 * Best effort. Signed out, offline or failing, the answers stay on the device.
 *
 * `finished` is passed by the onboarding flow alone, and stamps the copy with
 * the version of the flow that was just answered, so the reader's other
 * devices take these answers and do not ask again. A change made in Settings
 * keeps whatever version the copy already carried: changing one answer there
 * is not going through the questions.
 */
export async function saveSpaceToAccount(opts: { finished?: boolean } = {}): Promise<void> {
  const level = readLevel();
  // Nothing answered yet (a skipped flow): nothing worth keeping.
  if (!level) return;
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const before = (session.user.user_metadata?.purify_space ?? null) as { v?: unknown } | null;
    const carried = typeof before?.v === "number" ? before.v : undefined;
    const v = opts.finished ? ONBOARDING_VERSION : carried;
    await supabase.auth.updateUser({
      data: {
        purify_space: {
          level,
          intent: readIntent(),
          fasting: readFastingRule(),
          savedAt: new Date().toISOString(),
          ...(v === undefined ? {} : { v }),
        },
      },
    });
    // Focus and depth ride the older profiles sync; send them now rather
    // than at the next sign-in.
    await pushProfilePrefs();
  } catch {
    /* kept on the device */
  }
}
