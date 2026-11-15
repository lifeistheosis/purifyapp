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

import { use, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import {
  armLanguageDeadline,
  languageSettled,
  languageSettledPromise,
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

/**
 * Every other screen of the apps, reached before the opening language is on
 * the screen (Updates 80, 1.9).
 *
 * The apps load one document, the front door's, and reach every other screen
 * by the router (scripts/lib/shell-server.mjs). A screen opened straight
 * away, as a notification or a link opens one, was drawn at once, before the
 * reader's words had come, so it was drawn in English and again in their
 * language a moment later: Community's sign-in link in Arabic moved 20.5px
 * sideways and the tab bar's labels changed under it
 * (docs/handoffs/updates-79.md, step 3). The gate above holds only Today.
 *
 * This suspends such a screen until the language is settled. The router's
 * move to it is a transition, and a transition that suspends keeps the screen
 * it came from: the front door under the launch slate. So the slate covers
 * the wait, and the screen is drawn once, in the reader's language and faces.
 * The settled mark has its own deadline (lib/i18n/launchLanguage.ts), so the
 * worst a fault can do is open the screen late, never withhold it.
 *
 * The apps only (MessagesProvider): the website draws each page on the
 * server in the reader's language. Never on the server, and never Today,
 * which the gate above holds and which carries the slate.
 */
export function RouteLanguageHold({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (typeof window !== "undefined" && path && path !== "/" && !languageSettled()) {
    use(languageSettledPromise());
  }
  return <>{children}</>;
}
