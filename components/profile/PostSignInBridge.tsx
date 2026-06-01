"use client";

import { useEffect, useState } from "react";
import { releaseLocal } from "@/lib/profile/localAccount";

/**
 * Mounted in the signed-in branch of `/account`. Two responsibilities:
 *
 *  1. **Release the local-account marker on first sign-in.** When a
 *     visitor who claimed a local profile signs in for the first time,
 *     `purify_local_account` is still in localStorage. Releasing it
 *     here lets the UI cleanly own a single account identity (public)
 *     after sign-in, instead of carrying both indicators forward.
 *
 *  2. **Surface the migration banner.** When (1) fires, we also stash
 *     a session flag (`purify_just_migrated`) so a small one-time
 *     gold banner appears the first time the user lands on /account
 *     post-sign-in. The banner reassures them their existing
 *     highlights / notes / bookmarks are syncing up (handled by the
 *     existing SyncBridge), and names what does NOT auto-migrate
 *     (prayer streaks, reader prefs, calendar style).
 *
 * Idempotent: subsequent /account visits in the same session see the
 * banner exactly once. New sessions don't re-fire because the
 * localStorage marker is already cleared.
 */

const LOCAL_KEY = "purify_local_account";
const SESSION_KEY = "purify_just_migrated";

export function PostSignInBridge() {
  const [show, setShow] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;

    // (1) Release local marker if it exists, and stash the session
    // flag so the banner shows on this page load.
    let justMigrated = false;
    try {
      const had = window.localStorage.getItem(LOCAL_KEY);
      if (had) {
        releaseLocal();
        window.sessionStorage.setItem(SESSION_KEY, "1");
        justMigrated = true;
      }
    } catch {
      /* localStorage / sessionStorage blocked → silently skip */
    }

    // (2) Decide whether to render the banner. Either we just released
    // (above) or a previous /account mount this session did.
    let shouldShow = justMigrated;
    try {
      if (
        !shouldShow &&
        window.sessionStorage.getItem(SESSION_KEY) === "1"
      ) {
        shouldShow = true;
      }
    } catch {
      /* noop */
    }
    if (shouldShow) setShow(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function dismiss() {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* noop */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="status"
      className="mt-6 rounded-lg border border-gold/45 bg-gold/[0.06] p-5 flex items-start gap-4"
    >
      <div className="min-w-0 flex-1">
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold mb-2">
          Welcome, your local data is syncing
        </p>
        <p className="font-serif text-body text-paper/90 leading-[1.65]">
          Your highlights, notes, and bookmarks from this device are being
          pushed to your account now. They&rsquo;ll show up on any device
          you sign in on. Reader settings stay on this device for now (no
          server table yet).
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-pill text-paper/65 hover:text-paper"
      >
        ✕
      </button>
    </div>
  );
}
