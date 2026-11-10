"use client";

import { useEffect } from "react";

import { loadLiveList } from "@/lib/chants/live";
import { checkSavedChants } from "@/lib/chants/offline";
import { isNativeClient } from "@/lib/platform/native";
import { checkSaved } from "@/lib/readAloud/offline";
import { resumeSaving } from "@/lib/readAloud/saving";
import { keepWeek } from "@/lib/readAloud/week";

/**
 * Picks up a book's saving to listen offline that was left unfinished (1.9,
 * lib/readAloud/saving.ts): the app closed while it saved, or it waits for
 * Wi-Fi or a signal. When the app opens and each time it comes back to the
 * front; while it is open, the saving watches the connection itself. Then
 * the week's readings (lib/readAloud/week.ts): the chapters of the coming
 * week kept, on Wi-Fi, and those whose day has passed taken away. Then the
 * chants saved on the phone (1.9, lib/chants/offline.ts): settled as the
 * chapters are, and while any is saved the list of recordings is read, so a
 * recording taken down from the admin leaves the phone even if the reader
 * never opens Chants. Renders nothing, and does nothing on the website,
 * where nothing is saved.
 *
 * Not at once on open, as PackBridge waits: the first seconds belong to
 * drawing Today, and a saving is nothing a reader is waiting to see.
 */
const SETTLE_MS = 5000;

export function SavingBridge() {
  useEffect(() => {
    if (!isNativeClient()) return;
    // First, the saved recordings settled (lib/readAloud/offline.ts,
    // checkSaved): once, those saved before 1.9 out of the iPhone's
    // iCloud-backed folder; each time, every saved chapter's address made
    // again from where it is now, since an update moves an iPhone app's folder.
    const run = () => {
      void checkSaved().then(() => resumeSaving()).then(() => keepWeek());
      void checkSavedChants().then((saved) => (saved > 0 ? loadLiveList() : undefined));
    };
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
