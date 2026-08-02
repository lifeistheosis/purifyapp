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
// Everything fails silent. If 20260802_profile_preferences.sql has not been
// applied, the update and select both error, both are swallowed, and the
// local preference keeps working exactly as it does today.

import { useEffect } from "react";

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
        if (user && !cancelled) await syncProfilePrefsOnSignIn();
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
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
