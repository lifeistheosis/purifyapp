"use client";

// How many catechisms this reader has completed, for the one quiet line on
// /account. Reads the device store and, signed in, the reader's own rows
// under RLS, and reports whichever is larger: a device that has never synced
// and an account used on another phone are both real.
//
// Zero on the first frame, then the counts after mount, the same shape as
// lib/profile/useReadingStats.ts and for the same reason (a localStorage
// scan is not a stable snapshot for useSyncExternalStore). A missing table
// is a failed read and is simply ignored; the device count stands.

import { useEffect, useState } from "react";

import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { createClient } from "@/lib/supabase/client";

import { CATECHISM_EVENT, completionCount } from "./local";

export function useCompletionCount(): number {
  const [local, setLocal] = useState(0);
  const [remote, setRemote] = useState(0);

  useEffect(() => {
    function recompute() {
      setLocal(completionCount());
    }
    recompute();
    window.addEventListener(CATECHISM_EVENT, recompute);
    window.addEventListener("storage", recompute);
    return () => {
      window.removeEventListener(CATECHISM_EVENT, recompute);
      window.removeEventListener("storage", recompute);
    };
  }, []);

  useEffect(() => {
    if (!readLocalSessionUser()) return;
    let alive = true;
    (async () => {
      try {
        const { count, error } = await createClient()
          .from("quiz_attempts")
          .select("id", { count: "exact", head: true });
        if (alive && !error && typeof count === "number") setRemote(count);
      } catch {
        /* the device count stands */
      }
    })();
    return () => {
      alive = false;
    };
  }, [local]);

  return Math.max(local, remote);
}
