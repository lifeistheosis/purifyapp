"use client";

import { useEffect } from "react";

import { syncPacks } from "@/lib/packs/sync";
import { isNativeClient } from "@/lib/platform/native";
import { SITE_URL } from "@/lib/site";

/**
 * Asks the website for new content packs (lib/packs) when the app opens and
 * each time it comes back to the front. Renders nothing, and does nothing on
 * the website, which is already current.
 *
 * Not at once on open. The first seconds belong to drawing Today and lifting
 * the logo screen, and a pack changes nothing a reader is waiting for, so the
 * ask waits until the app has settled. syncPacks() keeps it to one ask in half
 * an hour, so coming back to the app often costs nothing.
 */
const SETTLE_MS = 4000;

export function PackBridge() {
  useEffect(() => {
    if (!isNativeClient()) return;
    const ask = () => {
      void syncPacks({ site: SITE_URL });
    };
    const timer = window.setTimeout(ask, SETTLE_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") ask();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
