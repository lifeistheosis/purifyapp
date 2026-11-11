"use client";

// The reader's space, copied to their account (user_metadata.purify_space) so
// a new device they sign in on starts from the same picks. The device copy
// is still the one every surface reads; this is the backup. Filling a device
// from it is fillSpaceFromAccount in ./state.ts, run on sign-in by
// lib/profile/preferences.ts.
//
// user_metadata rather than a profiles column: it needs no migration, and it
// arrives with the session, so a fresh device can read it without a query.
//
// What the copy holds is what the privacy page names: what the reader is
// looking for, and the version of the questions they answered. The answers
// about their faith are NOT in it (his "yes privacy", 2026-11-11, call 32):
// how familiar they are with Orthodox Christianity, whether they are coming
// back after time away, and where they come from say what a person believes
// (special-category data, GDPR Art. 9), nobody was asked whether they may be
// kept beside an email, and the app is drawn on the device, which is where
// they stay. The fast they keep stays there with them (his "yes fasting",
// the same day): it is a practice of the faith in itself, and it follows
// from the level, since a new reader's fast is set by it (./space.ts,
// defaultsFor: an inquirer's is hidden, the practicing keep it strictly), so
// a copy that kept the fast would still tell the level. A copy written by an older build is
// cleared of them at the reader's next sign-in (clearFaithAnswersFromAccount
// below); the copies of readers who never open 1.9 are cleared by the owner's
// SQL (docs/1.9-build/HANDOFF.md, 2026-11-11 05:03). Held by
// ./__tests__/faithAnswers.test.ts.

import { pushProfilePrefs } from "@/lib/profile/preferences";
import { createClient } from "@/lib/supabase/client";
import { ONBOARDING_VERSION, readIntent, readIntents, readLevel } from "./state";
import { isTesting } from "./testing";

/**
 * Best effort. Signed out, offline or failing, the answers stay on the device.
 *
 * `finished` is passed by the onboarding flow alone, and stamps the copy with
 * the version of the flow that was just answered, so the reader's other
 * devices take these answers and do not ask again. A change made in Settings
 * keeps whatever version the copy already carried: changing one answer there
 * is not going through the questions.
 *
 * Never in Testers mode (./testing.ts): the answers on the device are a test
 * then, and the account keeps the reader's own.
 */
export async function saveSpaceToAccount(opts: { finished?: boolean } = {}): Promise<void> {
  if (isTesting()) return;
  // Nothing answered yet (a skipped flow): nothing worth keeping. The level
  // is read here only to know that, on the device; it is never sent.
  if (!readLevel()) return;
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
          intent: readIntent(),
          // Every pick of "What are you looking for?" in the order tapped
          // (1.8), the intent first. Read back by fillSpaceFromAccount.
          intents: readIntents(),
          savedAt: new Date().toISOString(),
          ...(v === undefined ? {} : { v }),
        },
      },
    });
    // Focus rides the older profiles sync; send it now rather than at the
    // next sign-in.
    await pushProfilePrefs();
  } catch {
    /* kept on the device */
  }
}

/** The answers that say what a reader believes, where they stand or how they keep the faith. None is kept with an account. */
export const FAITH_ANSWERS = ["level", "returning", "background", "fasting"] as const;

/** An account's copy with the faith answers taken off, or null when it holds none of them. */
export function withoutFaithAnswers(space: unknown): Record<string, unknown> | null {
  if (!space || typeof space !== "object" || Array.isArray(space)) return null;
  const copy = { ...(space as Record<string, unknown>) };
  let found = false;
  for (const key of FAITH_ANSWERS) {
    if (key in copy) {
      delete copy[key];
      found = true;
    }
  }
  return found ? copy : null;
}

let clearing: Promise<void> | null = null;

/**
 * Takes the faith answers off the copy the reader's own account still holds
 * from an older build. Run at every sign-in and at a signed-in cold start
 * (components/profile/ProfilePrefsBridge.tsx); it sends nothing once they are
 * gone. The rest of the copy is left exactly as it was.
 *
 * In Testers mode too: this writes none of a test's answers, it only takes
 * the reader's own off the server.
 *
 * A cold start asks twice in the same moment (the bridge's own look and the
 * session's first event), so askers share one run and the copy is sent once.
 */
export function clearFaithAnswersFromAccount(): Promise<void> {
  clearing ??= clearOnce().finally(() => {
    clearing = null;
  });
  return clearing;
}

async function clearOnce(): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const cleared = withoutFaithAnswers(session.user.user_metadata?.purify_space);
    if (!cleared) return;
    await supabase.auth.updateUser({ data: { purify_space: cleared } });
  } catch {
    /* the next sign-in tries again */
  }
}
