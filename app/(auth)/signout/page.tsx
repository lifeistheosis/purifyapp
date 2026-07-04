"use client";

// Sign-out screen. The account menus (YouMobile, AccountSettingsLinks) link
// here with a plain GET navigation, so this needs to be a real route — a
// missing one is what produced the "error screen on Sign out" tester report.
//
// The session lives in cookies that the SSR middleware reads and refreshes on
// every request. A browser-only signOut clears the client's in-memory session
// but does NOT reliably delete those cookies (the server set them with
// attributes the browser client can't match), so the redirect home just
// rehydrated the reader as still-signed-in — the "it goes to the front page
// but I'm still logged in" bug. So we clear the session where it actually
// lives:
//   1. POST to /api/auth/signout — the server expires the auth cookies with
//      the same attributes it set them with. This is the authoritative clear.
//   2. Also run a client signOut for the native app, whose static bundle has
//      no API routes and keeps its session client-side; there the fetch is a
//      harmless no-op and this is what signs it out.
//   3. Always navigate home, with a hard-timeout fallback, so a wedged call
//      can never trap the reader on "Signing you out…".

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutPage() {
  useEffect(() => {
    const goHome = () => window.location.assign("/");
    const fallback = window.setTimeout(goHome, 4000);

    void (async () => {
      // Clear the browser session first so any live components read as
      // signed-out immediately (and this is the whole sign-out on native).
      try {
        await createClient().auth.signOut({ scope: "local" });
      } catch {
        /* ignore — the server clear below is authoritative on the web */
      }
      // Authoritatively expire the SSR auth cookies. `redirect: "manual"`
      // keeps fetch from following the route's 302 to home (an extra request);
      // the browser still applies the cookie-clearing Set-Cookie headers.
      try {
        await fetch("/api/auth/signout", {
          method: "POST",
          credentials: "same-origin",
          redirect: "manual",
        });
      } catch {
        /* native/static export has no API route, or offline — fall through */
      }
      window.clearTimeout(fallback);
      goHome();
    })();

    return () => window.clearTimeout(fallback);
  }, []);

  return (
    <div className="text-center">
      <h1 className="font-sans text-title font-bold text-paper leading-tight mb-2">
        Signing you out…
      </h1>
      <p className="font-serif text-ui text-paper/75">
        One moment. We are taking you back to the start.
      </p>
    </div>
  );
}
