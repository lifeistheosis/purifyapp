"use client";

// Holds the app's first screen until the language it opens in is known.
//
// The apps are built in English and corrected on the device. Drawn at once,
// Today was drawn in English and then drawn again in the reader's language,
// with the splash already gone (lib/i18n/launchLanguage.ts has the
// measurements). Held here it is drawn once, in the right language. For a
// phone set to English the wait is the time it takes to ask the device what
// it remembers, a few milliseconds.
//
// It arms the wait's own deadline when it mounts, so a fault in the code
// that should settle the language can delay the first screen and never
// withhold it.

import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import {
  armLanguageDeadline,
  languageSettled,
  subscribeLanguageSettled,
} from "@/lib/i18n/launchLanguage";

/** The server draws nothing behind this gate, so it has nothing to settle. */
function notOnTheServer(): boolean {
  return false;
}

export function LaunchLanguageGate({ children }: { children: ReactNode }) {
  const settled = useSyncExternalStore(
    subscribeLanguageSettled,
    languageSettled,
    notOnTheServer,
  );
  useEffect(() => {
    armLanguageDeadline();
  }, []);
  return settled ? <>{children}</> : null;
}
