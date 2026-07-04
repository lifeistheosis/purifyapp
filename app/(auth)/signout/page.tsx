"use client";

// Sign-out screen. The account menus (YouMobile, AccountSettingsLinks) link
// here with a plain GET navigation, so this needs to be a real route — a
// missing one is what produced the "error screen on Sign out" tester report.
//
// We sign out on the client (clears the Supabase auth cookies in this same
// WebView/browser — no Custom Tab, no cross-origin hop) and then do a full
// navigation home so every cached, signed-in surface is rebuilt fresh.
//
// Two things keep this from stalling on "Signing you out…":
//   1. scope: "local" clears THIS device's session by wiping local cookies,
//      with no server round-trip to revoke the token everywhere. The default
//      global scope makes that network call, and when it hangs (a Supabase
//      outage, a flaky connection) the await never settles and the redirect
//      never fires — the reported "stuck on signing you out" bug. Signing out
//      of every device is a separate, explicit action (SignOutEverywhereCard).
//   2. A hard timeout leaves for home no matter what, so a wedged network
//      call can never trap the reader on this screen.

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutPage() {
  useEffect(() => {
    const goHome = () => window.location.assign("/");

    // Belt-and-suspenders: even if signOut never settles, leave within 2.5s.
    const fallback = window.setTimeout(goHome, 2500);

    createClient()
      .auth.signOut({ scope: "local" })
      .catch(() => {
        // The local session is cleared regardless; home rebuilds signed-out.
      })
      .finally(() => {
        window.clearTimeout(fallback);
        goHome();
      });

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
