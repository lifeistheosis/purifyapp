"use client";

import { useEffect } from "react";

import { isNativeClient } from "@/lib/platform/native";
import { resumeSaving } from "@/lib/readAloud/saving";
import { keepWeek } from "@/lib/readAloud/week";

/**
 * Picks up a book's saving to listen offline that was left unfinished (1.9,
 * lib/readAloud/saving.ts): the app closed while it saved, or it waits for
 * Wi-Fi or a signal. When the app opens and each time it comes back to the
 * front; while it is open, the saving watches the connection itself. Then
 * the week's readings (lib/readAloud/week.ts): the chapters of the coming
 * week kept, on Wi-Fi, and those whose day has passed taken away. Renders
 * nothing, and does nothing on the website, where nothing is saved.
 *
 * Not at once on open, as PackBridge waits: the first seconds belong to
 * drawing Today, and a saving is nothing a reader is waiting to see.
 */
const SETTLE_MS = 5000;

export function SavingBridge() {
  useEffect(() => {
    if (!isNativeClient()) return;
    const run = () => void resumeSaving().then(() => keepWeek());
    const timer = window.setTimeout(run, SETTLE_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
