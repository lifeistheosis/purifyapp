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
import { readFastingRule, readIntent, readLevel } from "./state";

/** Best effort. Signed out, offline or failing, the answers stay on the device. */
export async function saveSpaceToAccount(): Promise<void> {
  const level = readLevel();
  // Nothing answered yet (a skipped flow): nothing worth keeping.
  if (!level) return;
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.auth.updateUser({
      data: {
        purify_space: {
          level,
          intent: readIntent(),
          fasting: readFastingRule(),
          savedAt: new Date().toISOString(),
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
