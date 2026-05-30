"use client";

// Mount-once component that installs the prayer sync bridge.
// Mirrors the SyncBridge pattern used for bookmarks + annotations.
// Sits in the (app) layout so every prayer surface gets sync without
// re-mounting per page.

import { useEffect } from "react";
import { installPrayerSyncBridge, syncPrayersFromServer } from "@/lib/prayers/sync";
import { createClient } from "@/lib/supabase/client";

export function PrayerSyncBridge() {
  useEffect(() => {
    const teardown = installPrayerSyncBridge();
    // Initial two-way pull on mount when signed in. Idempotent.
    (async () => {
      try {
        const supa = createClient();
        const {
          data: { user },
        } = await supa.auth.getUser();
        if (user) await syncPrayersFromServer();
      } catch {
        /* ignore */
      }
    })();
    return teardown;
  }, []);
  return null;
}
