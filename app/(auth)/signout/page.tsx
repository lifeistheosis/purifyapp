"use client";

// Sign-out screen. The account menus (YouMobile, AccountSettingsLinks) link
// here with a plain GET navigation, so this needs to be a real route — a
// missing one is what produced the "error screen on Sign out" tester report.
//
// We sign out on the client (clears the Supabase auth cookies in this same
// WebView/browser — no Custom Tab, no cross-origin hop) and then do a full
// navigation home so every cached, signed-in surface is rebuilt fresh.

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutPage() {
  useEffect(() => {
    let done = false;
    void (async () => {
      try {
        await createClient().auth.signOut();
      } catch {
        // Even if the network call fails, fall through and leave — the local
        // session is cleared and home will reflect a signed-out state.
      }
      if (!done) window.location.assign("/");
    })();
    return () => {
      done = true;
    };
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
