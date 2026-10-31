"use client";

// Keeps the reader's stated interests with their account instead of with the
// device they happened to answer on.
//
// Mounted in the ROOT layout, not the (app) group, because onboarding runs
// over Today and Today is app/page.tsx, outside that group. The reader who
// answers "what draws you" and then signs in at the last onboarding step is
// precisely the reader whose answer must be kept, and they may never mount
// the (app) layout at all.
//
// Unlike PrayerSyncBridge, which resolves auth once when it installs, this
// listens to `onAuthStateChange`. That is the difference between syncing on
// sign-in and syncing on the next full remount after sign-in: the sign-in at
// the end of onboarding does not necessarily remount anything.
//
// Everything fails silent. If 20260802000000_profile_preferences.sql has not been
// applied, the update and select both error, both are swallowed, and the
// local preference keeps working exactly as it does today.
//
// Collection progress (lib/catechism/progressSync.ts) rides the same two
// moments, for the same reason: the reader who finished a collection signed
// out and then signs in is the reader whose set must reach the account.
//
// So does a priest's or deacon's request for the clergy seal (1.8.x): answered
// in the welcome questions without an account, it waits on the device and goes
// to the team at the first sign-in (lib/onboarding/clergyRequest.ts). It does
// nothing when no request is waiting.

import { useEffect } from "react";

import { syncCollectionProgressOnSignIn } from "@/lib/catechism/progressSync";
import { flushClergyRequest } from "@/lib/onboarding/clergyRequest";
import { syncProfilePrefsOnSignIn } from "@/lib/profile/preferences";
import { createClient } from "@/lib/supabase/client";

export function ProfilePrefsBridge() {
  useEffect(() => {
    let cancelled = false;
    const supa = createClient();

    // Already signed in when this mounted (cold start on a signed-in device).
    void (async () => {
      try {
        const {
          data: { user },
        } = await supa.auth.getUser();
        if (user && !cancelled) {
          await syncProfilePrefsOnSignIn();
          await syncCollectionProgressOnSignIn();
          await flushClergyRequest();
        }
      } catch {
        /* ignore */
      }
    })();

    // And every subsequent sign-in, including the one at the end of
    // onboarding. SIGNED_OUT and TOKEN_REFRESHED are deliberately ignored:
    // there is nothing to reconcile on either.
    const {
      data: { subscription },
    } = supa.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void syncProfilePrefsOnSignIn();
        void syncCollectionProgressOnSignIn();
        // On a timer: it asks for the session, and the callback runs inside
        // the auth lock (lib/profile/myPicture.ts says why that must wait).
        window.setTimeout(() => void flushClergyRequest(), 0);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
